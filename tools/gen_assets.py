#!/usr/bin/env python3
# AI 资产生成器: minimax 图像(关卡背景) + minimax 音乐 + cf.douzimi 备用
import json, base64, urllib.request, os, sys

D = "/Users/diyuan/Project/github-cr/play.dungeon"
IMG = f"{D}/assets/img/levels"; UI = f"{D}/assets/img/ui"; BGM = f"{D}/assets/audio/bgm"
for p in (IMG, UI, BGM): os.makedirs(p, exist_ok=True)
MMKEY = "sk-cp-g2B6sEzavQ5nKqPszn6aqBE9ictkmXkWGYvYU6DjWYL9CxGzwkNSy3hwqrgjBlM54TL5nMPB13-W88kEb76-IavaQHysXVtNN-zogFFcANoiew-aXMYkl9Y"
CFKEY = "sk-LevqgoSsx0T8uoARC17zTQjvkfJO9MFfv8X4Kk5R7Sd9RKxe"

def post(url, payload, key, timeout=180):
    req = urllib.request.Request(url, data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=timeout).read())

def dl(url, out):
    urllib.request.urlretrieve(url, out)

def gen_image_minimax(prompt, out, ratio="16:9"):
    d = post("https://api.minimaxi.com/v1/image_generation",
        {"model":"image-01","prompt":prompt,"aspect_ratio":ratio,"response_format":"url","n":1,"prompt_optimizer":True}, MMKEY, 120)
    urls = d.get("data",{}).get("image_urls") or []
    if urls: dl(urls[0], out); return True
    return False

def gen_image_cf(prompt, out, model="gpt-image-2", size="1536x1024"):
    d = post("http://cf.douzimi.com:58728/v1/images/generations",
        {"model":model,"prompt":prompt,"n":1,"size":size}, CFKEY, 180)
    it = (d.get("data") or [{}])[0]
    if it.get("url"): dl(it["url"], out); return True
    if it.get("b64_json"):
        open(out,"wb").write(base64.b64decode(it["b64_json"])); return True
    return False

def gen_music(prompt, out):
    d = post("https://api.minimaxi.com/v1/music_generation",
        {"model":"music-2.6","prompt":prompt,"lyrics":"[Instrumental]",
         "audio_setting":{"sample_rate":44100,"bitrate":256000,"format":"mp3"}}, MMKEY, 200)
    audio = d.get("data",{}).get("audio")
    if not audio: print("  music no audio:", str(d)[:200]); return False
    raw = bytes.fromhex(audio) if all(c in "0123456789abcdefABCDEF" for c in audio[:64]) else base64.b64decode(audio)
    open(out,"wb").write(raw); return True

LEVELS = [
 ("level1-dungeon","dark fantasy dungeon interior game background, pixel art, deep purple and violet, stone brick walls, glowing torches, ominous, top-down rpg arena backdrop, highly detailed, no characters"),
 ("level2-graveyard","spooky forest graveyard at night game background, pixel art, dark green and teal fog, tombstones, dead twisted trees, crows, eerie moonlight, top-down rpg arena backdrop, no characters"),
 ("level3-castle","ancient sandstone castle ruins game background, pixel art, warm red and orange stone, banners, braziers, desert fortress arena, top-down rpg backdrop, no characters"),
 ("level4-abyss","volcanic fire abyss game background, pixel art, orange and black lava rivers, obsidian rocks, floating embers, flames, hellish dungeon arena, top-down rpg backdrop, no characters"),
 ("level5-halloween","halloween haunted festival game background, pixel art, orange and purple night, jack-o-lanterns, witch cauldrons, candles, spooky, top-down rpg arena backdrop, no characters"),
]
MUSIC = [
 ("bgm-battle","Epic dark dungeon battle music, intense orchestral driving percussion, retro 16-bit RPG style, tense energetic, seamless loop, instrumental no vocals"),
 ("bgm-boss","Epic boss battle theme, heavy drums, dark choir, dramatic orchestral metal fusion, retro game boss fight, very intense, instrumental no vocals"),
 ("bgm-menu","Mysterious dark fantasy menu theme, atmospheric dungeon ambience, spooky halloween mood, slow haunting, retro game style, instrumental no vocals"),
 ("bgm-victory","Short triumphant victory fanfare, heroic orchestral jingle, uplifting retro game win theme, instrumental no vocals"),
 ("bgm-defeat","Short somber defeat theme, dark melancholic game over music, haunting retro game style, instrumental no vocals"),
]

def done(p): return os.path.exists(p) and os.path.getsize(p) > 2000

print("=== 关卡背景 ===")
for name, prompt in LEVELS:
    out = f"{IMG}/{name}.png"
    if done(out): print("skip", name); continue
    ok = False
    try:
        print("minimax ->", name); ok = gen_image_minimax(prompt, out)
    except Exception as e: print("  mm err", e)
    if not ok:
        try:
            print("cf fallback ->", name); ok = gen_image_cf(prompt, out)
        except Exception as e: print("  cf err", e)
    print(("DONE " if done(out) else "FAIL ")+name)

print("=== 音乐 ===")
for name, prompt in MUSIC:
    out = f"{BGM}/{name}.mp3"
    if done(out): print("skip", name); continue
    ok = False
    try:
        print("minimax ->", name); ok = gen_music(prompt, out)
    except Exception as e: print("  err", e)
    print(("DONE " if done(out) else "FAIL ")+name)

print("=== UI 图 (cf Qwen) ===")
for name, prompt in [("logo","pixel art game logo emblem, dark dungeon knight sword and shield, purple and gold, retro 16-bit, on dark background"),
                     ("coin","single gold coin pixel art icon, retro game, on dark background")]:
    out = f"{UI}/{name}.png"
    if done(out): print("skip", name); continue
    try:
        gen_image_cf(prompt, out, model="Qwen/Qwen-image", size="1024x1024")
    except Exception as e: print("  qwen err", e)
    print(("DONE " if done(out) else "FAIL ")+name)

print("===== FINISH =====")
