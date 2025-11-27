"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import WaveSurfer, { type WaveSurferOptions } from "wavesurfer.js";

type WaveformAudioPlayerProps = {
  src: string;
  onPlayStateChange?: (isPlaying: boolean) => void;
};

export type WaveformAudioPlayerHandle = {
  togglePlay: () => void;
};

export const WaveformAudioPlayer = forwardRef<WaveformAudioPlayerHandle, WaveformAudioPlayerProps>(
  function WaveformAudioPlayer({ src, onPlayStateChange }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const [isReady, setIsReady] = useState(false);

    useImperativeHandle(ref, () => ({
      togglePlay: () => {
        const ws = wavesurferRef.current;
        if (!ws || !isReady) return;
        ws.isPlaying() ? ws.pause() : ws.play();
      },
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      setIsReady(false);

      const options: WaveSurferOptions = {
        container: containerRef.current,
        waveColor: "#000000",
        progressColor: "#FF7F19",
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 40,
      };

      const ws = WaveSurfer.create(options);
      wavesurferRef.current = ws;
      ws.load(src).catch((error) => {
        // Destroying the instance aborts any in-flight fetch; ignore that abort.
        if (error?.name === "AbortError") return;
        console.error("WaveSurfer load error:", error);
      });

      const handleReady = () => {
        setIsReady(true);
      };

      const handlePlay = () => {
        onPlayStateChange?.(true);
      };

      const handlePause = () => {
        onPlayStateChange?.(false);
      };

      ws.on("ready", handleReady);
      ws.on("play", handlePlay);
      ws.on("pause", handlePause);
      ws.on("finish", handlePause);

      return () => {
        ws.un("ready", handleReady);
        ws.un("play", handlePlay);
        ws.un("pause", handlePause);
        ws.un("finish", handlePause);
        ws.destroy();
        wavesurferRef.current = null;
      };
    }, [src, onPlayStateChange]);

    return (
      <div className="w-full">
        <div ref={containerRef} className="w-full" />
      </div>
    );
  },
);
