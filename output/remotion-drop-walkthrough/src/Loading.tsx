import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';

// Animate the exact official Homie symbol. 90 frames = a seamless 3-second loop.
export const HomieLoading: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 90;
  const breath = (1 - Math.cos(t * Math.PI * 2)) / 2;
  const logo = staticFile('assets/homie-mark-charcoal.png');
  return <AbsoluteFill style={{background:'#fff',alignItems:'center',justifyContent:'center'}}>
    <div style={{position:'relative',width:128,height:154,transform:`scale(${1 + breath * .045})`,opacity:.7 + breath * .3}}>
      <Img src={logo} style={{display:'block',width:'100%',height:'100%',objectFit:'contain'}}/>
      <div style={{position:'absolute',inset:0,maskImage:`url("${logo}")`,WebkitMaskImage:`url("${logo}")`,maskSize:'contain',WebkitMaskSize:'contain',maskRepeat:'no-repeat',WebkitMaskRepeat:'no-repeat',maskPosition:'center',WebkitMaskPosition:'center',overflow:'hidden'}}>
        <div style={{position:'absolute',top:-20,bottom:-20,left:-100+t*340,width:65,background:'linear-gradient(90deg,transparent,#ffffff85,transparent)',transform:'skewX(-18deg)',opacity:Math.sin(t*Math.PI)**2}}/>
      </div>
    </div>
  </AbsoluteFill>;
};
