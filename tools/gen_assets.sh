#!/bin/bash
# AI 资产生成管线: 背景(minimax/cf) + 音乐(minimax) + 简单图(Qwen)
D=/Users/diyuan/Project/github-cr/play.dungeon
IMG="$D/assets/img/levels"
UI="$D/assets/img/ui"
BGM="$D/assets/audio/bgm"
MMKEY="sk-cp-g2B6sEzavQ5nKqPszn6aqBE9ictkmXkWGYvYU6DjWYL9CxGzwkNSy3hwqrgjBlM54TL5nMPB13-W88kEb76-IavaQHysXVtNN-zogFFcANoiew-aXMYkl9Y"
CFKEY="sk-LevqgoSsx0T8uoARC17zTQjvkfJO9MFfv8X4Kk5R7Sd9RKxe"
mkdir -p "$IMG" "$UI" "$BGM"

# 下载助手: 从 JSON 里提取 url 或 b64
fetch_url() { python3 -c "import sys,json,base64,urllib.request;
d=json.load(sys.stdin);
u=None
try:
  it=d['data'][0]
  u=it.get('url')
  b=it.get('b64_json')
  if u:
    urllib.request.urlretrieve(u, sys.argv[1]); print('saved-url',sys.argv[1]); sys.exit(0)
  if b:
    open(sys.argv[1],'wb').write(base64.b64decode(b)); print('saved-b64',sys.argv[1]); sys.exit(0)
except Exception as e:
  print('ERR',e)
print('no-image')" "$1"; }

# ---------- 1) 5 个关卡背景 (优先 minimax, 失败再用 cf) ----------
declare -a LV=(
 "level1-dungeon|dark fantasy dungeon interior, pixel art game background, deep purple and violet tones, stone brick walls, torches, ominous atmosphere, top-down rpg backdrop, highly detailed"
 "level2-graveyard|spooky forest graveyard at night, pixel art game background, dark green and teal fog, tombstones, dead trees, crows, eerie moonlight, top-down rpg backdrop"
 "level3-castle|ancient sandstone castle ruins, pixel art game background, warm red and orange stone, banners, braziers, desert fortress interior, top-down rpg backdrop"
 "level4-abyss|volcanic fire abyss, pixel art game background, orange and black lava, obsidian rocks, embers, flames, hellish dungeon, top-down rpg backdrop"
 "level5-halloween|halloween haunted scene, pixel art game background, orange and purple, jack-o-lanterns, witch cauldrons, candles, spooky festival night, top-down rpg backdrop"
)
for item in "${LV[@]}"; do
  name="${item%%|*}"; prompt="${item#*|}"
  out="$IMG/$name.png"
  [ -s "$out" ] && { echo "skip $name"; continue; }
  echo "== GEN bg $name (minimax) =="
  curl -s -m 90 -X POST "https://api.minimaxi.com/v1/image_generation" \
    -H "Authorization: Bearer $MMKEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"image-01\",\"prompt\":\"$prompt\",\"aspect_ratio\":\"16:9\",\"response_format\":\"url\",\"n\":1,\"prompt_optimizer\":true}" \
    | python3 -c "import sys,json,urllib.request;
try:
  d=json.load(sys.stdin); u=d['data']['image_urls'][0]; urllib.request.urlretrieve(u,'$out'); print('ok','$out')
except Exception as e: print('mm-fail',e)"
  # 失败则 cf.douzimi
  if [ ! -s "$out" ]; then
    echo "== GEN bg $name (cf fallback) =="
    curl -4 -s -m 120 -X POST "http://cf.douzimi.com:58728/v1/images/generations" \
      -H "Authorization: Bearer $CFKEY" -H "Content-Type: application/json" \
      -d "{\"model\":\"gpt-image-2\",\"prompt\":\"$prompt\",\"n\":1,\"size\":\"1536x1024\"}" > /tmp/cf_bg.json 2>/dev/null
    fetch_url "$out" < /tmp/cf_bg.json
  fi
  [ -s "$out" ] && echo "DONE $name $(du -h "$out"|cut -f1)" || echo "FAIL $name"
done

# ---------- 2) 音乐 (minimax music-2.6) ----------
gen_music(){
  local name="$1" prompt="$2" out="$BGM/$name.mp3"
  [ -s "$out" ] && { echo "skip music $name"; return; }
  echo "== GEN music $name =="
  curl -s -m 180 -X POST "https://api.minimaxi.com/v1/music_generation" \
    -H "Authorization: Bearer $MMKEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"music-2.6\",\"prompt\":\"$prompt\",\"lyrics\":\"[Instrumental]\",\"audio_setting\":{\"sample_rate\":44100,\"bitrate\":256000,\"format\":\"mp3\"},\"output_format\":\"url\"}" \
    | python3 -c "import sys,json,urllib.request,base64;
try:
  d=json.load(sys.stdin)
  dd=d.get('data',{})
  u=dd.get('audio') or dd.get('audio_url') or (dd.get('audio') if isinstance(dd,dict) else None)
  if isinstance(u,str) and u.startswith('http'):
    urllib.request.urlretrieve(u,'$out'); print('ok-url','$out'); sys.exit(0)
  if isinstance(u,str):
    open('$out','wb').write(base64.b64decode(u)); print('ok-b64','$out'); sys.exit(0)
  print('mm-music-nofield', json.dumps(d)[:300])
except Exception as e: print('mm-music-fail',e)"
  [ -s "$out" ] && echo "DONE music $name $(du -h "$out"|cut -f1)" || echo "FAIL music $name"
}
gen_music "bgm-battle" "Epic dark dungeon battle music, intense orchestral with driving percussion, retro 16-bit RPG style, tense and energetic, seamless loop, no vocals"
gen_music "bgm-boss" "Epic boss battle theme, heavy drums, dark choir, dramatic orchestral metal fusion, retro game boss fight, very intense, no vocals"
gen_music "bgm-menu" "Mysterious dark fantasy menu theme, atmospheric dungeon ambience, spooky halloween mood, slow and haunting, retro game style, no vocals"
gen_music "bgm-victory" "Short triumphant victory fanfare, heroic orchestral jingle, uplifting retro game win theme, no vocals"
gen_music "bgm-defeat" "Short somber defeat theme, dark melancholic game over music, haunting, retro game style, no vocals"

# ---------- 3) 简单 UI 图 (cf Qwen-image, 失败则跳过) ----------
gen_qwen(){
  local name="$1" prompt="$2" out="$UI/$name.png"
  [ -s "$out" ] && { echo "skip ui $name"; return; }
  echo "== GEN ui $name =="
  curl -4 -s -m 120 -X POST "http://cf.douzimi.com:58728/v1/images/generations" \
    -H "Authorization: Bearer $CFKEY" -H "Content-Type: application/json" \
    -d "{\"model\":\"Qwen/Qwen-image\",\"prompt\":\"$prompt\",\"n\":1,\"size\":\"1024x1024\"}" > /tmp/qwen.json 2>/dev/null
  fetch_url "$out" < /tmp/qwen.json
  [ -s "$out" ] && echo "DONE ui $name" || echo "FAIL ui $name"
}
gen_qwen "logo" "pixel art game logo emblem, dark dungeon knight sword and shield, purple and gold, retro 16-bit, transparent-style on dark background"
gen_qwen "coin" "single gold coin pixel art icon, retro game, on dark background"

echo "===== ALL DONE ====="
ls -la "$IMG" "$BGM" "$UI"
