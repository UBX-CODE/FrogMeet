import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ArrowRight,
} from "lucide-react";

export default function PreJoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const roomId = searchParams.get("room");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [name, setName] = useState("");
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 2;
    const y = (clientY / innerHeight - 0.5) * 2;
    setMousePos({ x, y });
  };

  useEffect(() => {
    startMedia();

    return () => {
      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  const startMedia = async () => {
    try {
      setCameraError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error("Media permission error:", error);

      setCameraError(
        "Camera or microphone permission was denied."
      );
    }
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current
      ?.getAudioTracks()[0];

    if (!audioTrack) return;

    audioTrack.enabled = !audioTrack.enabled;
    setIsMicOn(audioTrack.enabled);
  };

  const toggleCamera = () => {
    const videoTrack = streamRef.current
      ?.getVideoTracks()[0];

    if (!videoTrack) return;

    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraOn(videoTrack.enabled);
  };

  const handleJoinMeeting = () => {
    if (!roomId || !name.trim()) return;

    navigate(`/meeting/${roomId}`, {
      state: {
        name: name.trim(),
        isMicOn,
        isCameraOn,
      },
    });
  };

  return (
    <main onMouseMove={handleMouseMove} className="min-h-screen bg-[#F4F0E6] text-black px-6 py-10 relative overflow-hidden">
      {/* Parallax Background Elements */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div 
          className="absolute top-[10%] right-[10%] w-32 h-16 bg-[#00C853] rounded-full border-[4px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform duration-75 ease-out"
          style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px) rotate(15deg)` }}
        ></div>
        <div 
           className="absolute bottom-[20%] left-[5%] w-24 h-24 bg-[#00E676] rounded-full border-[4px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-transform duration-75 ease-out flex items-center justify-center"
           style={{ transform: `translate(${mousePos.x * -20}px, ${mousePos.y * -20}px) rotate(-10deg)` }}
        >
           <div className="w-12 h-6 bg-black rounded-b-full"></div>
        </div>
      </div>
      
      <div className="mx-auto max-w-6xl relative z-10">

        <header className="mb-10">
          <h1 className="text-3xl font-black uppercase">
            Ready to join?
          </h1>

          <p className="mt-2 text-zinc-600">
            Room: {roomId || "Invalid room"}
          </p>
        </header>

        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">

          {/* Video Preview */}
          <section className="relative overflow-hidden border-[4px] border-black bg-black shadow-[10px_10px_0_0_rgba(0,0,0,1)]">

            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />

            {!isCameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-white">
                <div className="text-center">
                  <VideoOff
                    size={42}
                    className="mx-auto mb-3"
                  />

                  <p className="font-bold uppercase">
                    Camera Off
                  </p>
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-4">

              <button
                onClick={toggleMic}
                className={`flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black transition-colors ${
                  isMicOn
                    ? "bg-white text-black"
                    : "bg-[#00C853] text-white"
                }`}
              >
                {isMicOn ? (
                  <Mic size={24} />
                ) : (
                  <MicOff size={24} />
                )}
              </button>

              <button
                onClick={toggleCamera}
                className={`flex h-14 w-14 items-center justify-center rounded-full border-[3px] border-black transition-colors ${
                  isCameraOn
                    ? "bg-white text-black"
                    : "bg-[#00C853] text-white"
                }`}
              >
                {isCameraOn ? (
                  <Video size={24} />
                ) : (
                  <VideoOff size={24} />
                )}
              </button>

            </div>
          </section>

          {/* Join Panel */}
          <section className="flex flex-col justify-center border-[4px] border-black bg-white p-8 shadow-[10px_10px_0_0_rgba(0,0,0,1)] relative overflow-hidden group">
            
            {/* Cute Frog peeking from corner */}
            <div className="absolute -bottom-12 -right-4 w-32 h-32 bg-[#00E676] rounded-full border-[4px] border-black transition-transform group-hover:-translate-y-6 duration-300">
               <div className="absolute top-6 left-6 w-6 h-6 bg-white rounded-full border-[3px] border-black flex items-center justify-center">
                 <div className="w-2 h-2 bg-black rounded-full translate-x-1"></div>
               </div>
               <div className="absolute top-6 right-8 w-6 h-6 bg-white rounded-full border-[3px] border-black flex items-center justify-center">
                 <div className="w-2 h-2 bg-black rounded-full translate-x-1"></div>
               </div>
               <div className="absolute top-16 left-1/2 -translate-x-1/2 w-12 h-6 bg-black rounded-b-full border-t-[2px] border-black">
                 <div className="w-6 h-4 bg-[#FF0055] rounded-t-full mx-auto translate-y-2"></div>
               </div>
            </div>

            <h2 className="text-3xl font-black uppercase">
              Join Meeting
            </h2>

            <p className="mt-3 text-zinc-600">
              Enter your display name before joining.
            </p>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-8 border-[3px] border-black px-5 py-4 text-lg font-bold outline-none"
            />

            <button
              onClick={handleJoinMeeting}
              disabled={!name.trim() || !roomId}
              className="mt-5 flex items-center justify-center gap-3 border-[3px] border-black bg-[#00C853] px-6 py-4 font-black uppercase text-white shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition hover:bg-[#00E676] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:bg-zinc-300 relative z-10"
            >
              Join Now
              <ArrowRight size={22} />
            </button>

            {cameraError && (
              <p className="mt-5 border-[3px] border-black bg-red-100 p-3 text-sm font-bold text-red-700">
                {cameraError}
              </p>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}