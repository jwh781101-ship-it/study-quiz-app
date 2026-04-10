import { createClient } from '@supabase/supabase-js'

const LIMITS = {
  guest: 3,    // 비회원
  free: 5,     // 무료 회원
  premium: 999 // 프리미엄
}

export async function GET(request) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // 서버에서는 service role key 사용
    )

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return Response.json({ plan: 'guest', used: 0, limit: LIMITS.guest, canUse: true })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return Response.json({ plan: 'guest', used: 0, limit: LIMITS.guest, canUse: true })
    }

    // 오늘 사용량 확인
    const today = new Date().toISOString().split('T')[0]
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, daily_count, last_used_date')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ plan: 'free', used: 0, limit: LIMITS.free, canUse: true })
    }

    // 날짜가 바뀌면 카운트 리셋
    const lastDate = profile.last_used_date
    const used = lastDate === today ? (profile.daily_count || 0) : 0
    const plan = profile.plan || 'free'
    const limit = LIMITS[plan]
    const canUse = used < limit

    return Response.json({ plan, used, limit, canUse })
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

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) return Response.json({ ok: true }) // 비회원은 서버 기록 안함

    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return Response.json({ ok: true })

    const today = new Date().toISOString().split('T')[0]
    const { data: profile } = await supabase
      .from('profiles')
      .select('daily_count, last_used_date')
      .eq('id', user.id)
      .single()

    const lastDate = profile?.last_used_date
    const newCount = lastDate === today ? (profile.daily_count || 0) + 1 : 1

    await supabase
      .from('profiles')
      .update({ daily_count: newCount, last_used_date: today })
      .eq('id', user.id)

    return Response.json({ ok: true, count: newCount })
  } catch(err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
