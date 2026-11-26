'use client';
import React, { useId } from 'react';
import { MATE_ITEMS } from './lib/mate';

const CHARACTERS = {
  dog: { name: '비솜이', fur: '#e9bd8e', shade: '#c99267' },
  cat: { name: '냥이', fur: '#cbbdea', shade: '#a995d1' },
  bear: { name: '곰이', fur: '#f1dfbf', shade: '#c9aa86' },
  penguin: { name: '펭귄이', fur: '#85b9d5', shade: '#568da9' },
};
const BACKGROUNDS = { sky: ['#dceeff', '#a7d9f3'], mint: ['#e0f8e9', '#a4dfc6'], peach: ['#fff0e8', '#f7c4b3'], night: ['#c5c8ec', '#8e9ac9'] };
export default function MateAvatar({ character = 'dog', background = 'sky', accessory = 'none', size = 360, decorative = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const pet = CHARACTERS[character] || CHARACTERS.dog;
  const colors = BACKGROUNDS[background] || BACKGROUNDS.sky;
  const bgName = MATE_ITEMS.find(item => item.kind === 'background' && item.id === background)?.name || '맑은 하늘';
  const accName = MATE_ITEMS.find(item => item.kind === 'accessory' && item.id === accessory)?.name || '그대로';
  return <svg viewBox="0 0 400 360" width={size} height={typeof size === 'number' ? size * .9 : undefined} style={{display:'block',width:size,maxWidth:'100%',height:'auto'}} role={decorative ? undefined : 'img'} aria-hidden={decorative ? true : undefined} aria-label={decorative ? undefined : `${pet.name}, ${bgName} 배경, ${accName} 착용`} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id={`${uid}-wall`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={colors[0]}/><stop offset="1" stopColor={colors[1]}/></linearGradient>
      <linearGradient id={`${uid}-fur`} x1="0" x2="0.8" y1="0" y2="1"><stop stopColor={pet.fur}/><stop offset="1" stopColor={pet.shade}/></linearGradient>
      <linearGradient id={`${uid}-window`} x1="0" x2="0" y1="0" y2="1"><stop stopColor={background === 'night' ? '#677aa8' : '#a5d8f2'}/><stop offset="1" stopColor={background === 'night' ? '#b8b7d9' : '#eaf8ff'}/></linearGradient>
    </defs>
    <rect width="400" height="360" rx="32" fill={`url(#${uid}-wall)`}/>
    <rect x="32" y="36" width="116" height="104" rx="18" fill="#fff" opacity=".8"/>
    <rect x="39" y="43" width="102" height="90" rx="12" fill={`url(#${uid}-window)`}/>
    {background === 'night' ? <g fill="#fff4c0"><circle cx="67" cy="68" r="3"/><circle cx="112" cy="60" r="2.5"/><circle cx="91" cy="100" r="2"/><path d="M117 91l2 5 5 2-5 2-2 5-2-5-5-2 5-2z"/></g> : <g fill="#fff" opacity=".9"><ellipse cx="70" cy="83" rx="18" ry="8"/><ellipse cx="82" cy="79" rx="13" ry="9"/><ellipse cx="113" cy="105" rx="16" ry="7"/></g>}
    <path d="M90 43v90M39 88h102" stroke="#fff" strokeWidth="5" opacity=".8"/>
    <path d="M0 271 Q200 245 400 271v89H0z" fill="#f2dfcf"/>
    <ellipse cx="202" cy="312" rx="134" ry="20" fill="#b8917c" opacity=".18"/>
    <path d="M313 267c-3-36 6-51 10-58m-2 27c-15-10-20-23-19-31m20 24c13-14 17-25 17-32" fill="none" stroke="#5e9f7b" strokeWidth="5" strokeLinecap="round"/>
    <ellipse cx="303" cy="204" rx="10" ry="17" fill="#84c69d" transform="rotate(-35 303 204)"/><ellipse cx="341" cy="197" rx="10" ry="17" fill="#75b68e" transform="rotate(35 341 197)"/><ellipse cx="322" cy="209" rx="10" ry="18" fill="#a0d8ae"/>
    <path d="M301 259h42l-5 30h-32z" fill="#f5b9a1"/><rect x="298" y="255" width="48" height="9" rx="4" fill="#f7cbb9"/>
    <rect x="39" y="256" width="90" height="9" rx="4.5" fill="#d8aa8d"/><path d="M48 265v42m72-42v42" stroke="#c99b7e" strokeWidth="7" strokeLinecap="round"/><rect x="55" y="238" width="36" height="18" rx="3" fill="#fff9ea"/><path d="M73 239v16" stroke="#d8cbb9" strokeWidth="2"/><rect x="100" y="235" width="12" height="20" rx="3" fill="#f6a998"/>
    <ellipse cx="208" cy="277" rx="76" ry="52" fill={`url(#${uid}-fur)`}/>
    {character === 'penguin' && <ellipse cx="208" cy="276" rx="46" ry="37" fill="#f8f5e9"/>}
    {character === 'dog' && <g fill={pet.shade}><ellipse cx="139" cy="180" rx="28" ry="46" transform="rotate(18 139 180)"/><ellipse cx="277" cy="180" rx="28" ry="46" transform="rotate(-18 277 180)"/></g>}
    {character === 'cat' && <g fill={pet.shade}><path d="M145 165l3-72 52 44z"/><path d="M270 165l-3-72-52 44z"/><path d="M154 138l2-28 22 22zM261 138l-2-28-22 22z" fill="#edc4d8"/></g>}
    {character === 'bear' && <g><circle cx="154" cy="134" r="27" fill={pet.shade}/><circle cx="262" cy="134" r="27" fill={pet.shade}/><circle cx="154" cy="134" r="15" fill="#e5b9ae"/><circle cx="262" cy="134" r="15" fill="#e5b9ae"/></g>}
    <ellipse cx="208" cy="182" rx="78" ry="70" fill={`url(#${uid}-fur)`}/>
    {character === 'penguin' && <path d="M148 183c0-36 20-46 37-34 12-18 34-18 46 0 18-12 37-2 37 34 0 36-28 57-60 57s-60-21-60-57z" fill="#fbf7ec"/>}
    <ellipse cx="181" cy="187" rx="5" ry="7" fill="#253c4b"/><ellipse cx="235" cy="187" rx="5" ry="7" fill="#253c4b"/>
    <ellipse cx="165" cy="204" rx="11" ry="6" fill="#ee9f9d" opacity=".6"/><ellipse cx="251" cy="204" rx="11" ry="6" fill="#ee9f9d" opacity=".6"/>
    {character === 'penguin' ? <path d="M197 201q11-8 22 0l-11 10z" fill="#e9aa5a"/> : <g><ellipse cx="208" cy="202" rx="7" ry="5" fill="#614b49"/><path d="M208 207q-1 10-10 8m10-8q1 10 10 8" fill="none" stroke="#614b49" strokeWidth="2.5" strokeLinecap="round"/></g>}
    {character === 'cat' && <g stroke="#9d8cb9" strokeWidth="2" strokeLinecap="round"><path d="M155 208l-20-3m21 10l-19 3m124-10l20-3m-21 10l19 3"/></g>}
    <ellipse cx="150" cy="269" rx="21" ry="31" fill={pet.fur} transform="rotate(28 150 269)"/><ellipse cx="266" cy="269" rx="21" ry="31" fill={pet.fur} transform="rotate(-28 266 269)"/>
    {accessory === 'cap' && <g><path d="M154 137q6-49 53-49t53 49z" fill="#759bc9"/><path d="M151 138q48-14 113 0l16 9q-71 7-129-3z" fill="#557dab"/><circle cx="208" cy="95" r="4" fill="#e5f2ff"/></g>}
    {accessory === 'glasses' && <g fill="none" stroke="#405c74" strokeWidth="5"><circle cx="181" cy="188" r="19"/><circle cx="235" cy="188" r="19"/><path d="M200 187q8-6 16 0M162 185l-15-4m107 4l15-4"/></g>}
    {accessory === 'headphones' && <g fill="none" stroke="#826eb8" strokeWidth="10" strokeLinecap="round"><path d="M136 185v-14c0-57 30-86 72-86s72 29 72 86v14"/><path d="M137 178v29m142-29v29" strokeWidth="17"/></g>}
    {accessory === 'star' && <g transform="translate(252 137)"><path d="M0-25l7 15 16 2-12 11 3 17L0 12l-14 8 3-17-12-11 16-2z" fill="#ffde77" stroke="#d9a84b" strokeWidth="3"/></g>}
  </svg>;
}
