import math, random, wave, struct
random.seed(8)
sr=44100; n=int(14.5*sr); a=[0.0]*n
def tone(start,duration,fn):
 for j in range(int(duration*sr)):
  k=int(start*sr)+j
  if k<n:a[k]+=fn(j/sr)
# Tight 128 BPM pulse, soft sub and restrained metallic ticks.
for beat in range(31):
 t=beat*60/128
 tone(t,.25,lambda s:.18*math.sin(2*math.pi*(49*s+1.7*(1-math.exp(-s*35))))*math.exp(-s*22))
 tone(t+.234,.06,lambda s:(random.random()*2-1)*.035*math.exp(-s*65))
 if beat%2: tone(t,.12,lambda s:(random.random()*2-1)*.045*math.exp(-s*32))
for i in range(5):
 tone((44+i*11)/30,.5,lambda s:(random.random()*2-1)*.11*math.sin(math.pi*s/.5)**3)
 tone((60+i*11)/30,.2,lambda s:.13*math.sin(2*math.pi*(150*s-150*s*s))*math.exp(-s*25))
for i in range(8):
 for hz in ([146.83,220,277.18] if i%2==0 else [123.47,185,246.94]):
  tone(i*1.875,2.1,lambda s,hz=hz:.024*math.sin(2*math.pi*hz*s)*(1-math.exp(-s*8))*math.exp(-s*1.7))
for i,hz in enumerate([587.33,739.99,880]):
 tone(4+i*.07,1,lambda s,hz=hz:.04*math.sin(2*math.pi*hz*s)*math.exp(-s*6))
out=bytearray()
for i,x in enumerate(a):
 v=int(max(-1,min(1,x))*32767*min(1,i/(sr*.03),(n-i)/(sr*.7)))
 out.extend(struct.pack('<hh',v,v))
with wave.open('output/remotion-drop-walkthrough/public/assets/luxury-sound.wav','w') as w:
 w.setparams((2,2,sr,0,'NONE','not compressed'));w.writeframes(out)
