import { createClient } from '@supabase/supabase-js' 

const LIMITS = {
  guest: 999,
  free: 999,
  premium: 999
}

function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         'unknown'
}

export async function GET(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const today = new Date().toISOString().split('T')[0]
    const authHeader = request.headers.get('Authorization')

    // 비로그인: IP 기반
    if (!authHeader) {
      const ip = getClientIP(request)
      const { data } = await supabase
        .from('guest_usage')
        .select('daily_count, last_used_date')
        .eq('ip', ip)
        .single()
      
      const used = data?.last_used_date === today ? (data.daily_count || 0) : 0
      return Response.json({ plan: 'guest', used, limit: LIMITS.guest, canUse: used < LIMITS.guest })
    }

    // 로그인 유저 (기존 코드 동일)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ plan: 'guest', used: 0, limit: LIMITS.guest, canUse: true })

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, daily_count, last_used_date')
      .eq('id', user.id)
      .single()

    if (!profile) return Response.json({ plan: 'free', used: 0, limit: LIMITS.free, canUse: true })

    const used = profile.last_used_date === today ? (profile.daily_count || 0) : 0
    const plan = profile.plan || 'free'
    return Response.json({ plan, used, limit: LIMITS[plan], canUse: used < LIMITS[plan] })

  } catch(err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const today = new Date().toISOString().split('T')[0]
    const authHeader = request.headers.get('Authorization')

    // 비로그인: IP 기반 카운트
    if (!authHeader) {
      const ip = getClientIP(request)
      const { data } = await supabase
        .from('guest_usage')
        .select('daily_count, last_used_date')
        .eq('ip', ip)
        .single()

      const newCount = data?.last_used_date === today ? (data.daily_count || 0) + 1 : 1
      
      await supabase
        .from('guest_usage')
        .upsert({ ip, daily_count: newCount, last_used_date: today })
      
      return Response.json({ ok: true, count: newCount })
    }

    // 로그인 유저 (기존 코드 동일)
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ ok: true })

    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_count, last_used_date')
      .eq('id', user.id)
      .single()

    const newCount = profile?.last_used_date === today ? (profile.daily_count || 0) + 1 : 1
    await supabase
      .from('profiles')
      .update({ daily_count: newCount, last_used_date: today })
      .eq('id', user.id)

    return Response.json({ ok: true, count: newCount })

  } catch(err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
