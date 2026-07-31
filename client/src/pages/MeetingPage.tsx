import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Users,
  MessageSquare,
  MoreVertical,
  Maximize,
  Pin,
  Share,
  ArrowLeft,
  X,
  Send
} from "lucide-react";

import { socket } from "../socket";

type MeetingState = {
  name?: string;
  isMicOn?: boolean;
  isCameraOn?: boolean;
};

const ParticipantVideo = ({ participant, className = "" }: { participant: any, className?: string }) => {
  return (
    <div className={`relative overflow-hidden bg-zinc-900 group shadow-lg flex items-center justify-center ${className}`}>
      {participant.isCameraOn ? (
        <video
          autoPlay
          playsInline
          muted={participant.isLocal}
          ref={(el) => {
            if (el && participant.stream) el.srcObject = participant.stream;
          }}
          className={`h-full w-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F4F0E6] group overflow-hidden border-[4px] border-black">
           {/* Frog Avatar */}
           <div className="flex h-20 w-20 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-t-full bg-[#00C853] text-2xl sm:text-4xl font-semibold text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] relative border-[3px] border-black transition-transform group-hover:scale-110 mt-6">
             <div className="absolute -top-4 left-0 w-8 h-8 bg-white rounded-full border-[3px] border-black flex items-center justify-center"><div className="w-3 h-3 bg-black rounded-full mt-1"></div></div>
             <div className="absolute -top-4 right-0 w-8 h-8 bg-white rounded-full border-[3px] border-black flex items-center justify-center"><div className="w-3 h-3 bg-black rounded-full mt-1"></div></div>
             <div className="z-10">{participant.name.charAt(0).toUpperCase()}</div>
             <div className="absolute bottom-3 w-10 h-4 bg-black rounded-b-full flex justify-center overflow-hidden"><div className="w-4 h-3 bg-[#FF0055] rounded-t-full translate-y-2 group-hover:translate-y-1 transition-transform"></div></div>
           </div>
        </div>
      )}

      {/* Name and Mic Status Badge */}
      <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 backdrop-blur-md border border-white/10 transition-opacity">
        {!participant.isMicOn ? (
          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-red-500 text-white">
            <MicOff size={12} />
          </div>
        ) : (
          <div className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-black/50 text-white hidden group-hover:flex">
             <Mic size={12} />
          </div>
        )}
        <span className="text-xs sm:text-sm font-medium text-white tracking-wide">
          {participant.name} {participant.isLocal ? "(You)" : ""}
        </span>
      </div>

      {/* Top right floating actions */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
         {participant.isLocal && (
          <div className="flex items-center gap-1 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md border border-white/10">
            Host <Pin size={12} className="ml-1" />
          </div>
         )}
         <button className="flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 transition-colors">
           <Maximize size={14} />
         </button>
      </div>
    </div>
  );
};

export default function MeetingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId } = useParams();

  const state = location.state as MeetingState | null;

  const streamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});

  const [isMicOn, setIsMicOn] = useState(state?.isMicOn ?? true);
  const [isCameraOn, setIsCameraOn] = useState(state?.isCameraOn ?? true);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');

  const name = state?.name ?? "Guest";

  const createPeerConnection = (targetUserId: string) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit("ice-candidate", {
          target: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prev) => ({
        ...prev,
        [targetUserId]: event.streams[0],
      }));
    };

    peerConnectionsRef.current[targetUserId] = peerConnection;

    return peerConnection;
  };

  useEffect(() => {
    if (!roomId || !isMediaReady) return;

    socket.connect();

    const handleConnect = () => {
      console.log("Connected to server:", socket.id);
      socket.emit("join-room", roomId);
    };

    const handleUserJoined = async (userId: string) => {
      console.log("New user joined:", userId);

      if (!streamRef.current) return;

      const peerConnection = createPeerConnection(userId);

      streamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, streamRef.current!);
      });

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("offer", {
        target: userId,
        offer,
      });
    };

    const handleOffer = async ({ sender, offer }: { sender: string; offer: RTCSessionDescriptionInit }) => {
      if (!streamRef.current) return;

      const peerConnection = createPeerConnection(sender);
      
      streamRef.current.getTracks().forEach((track) => {
        peerConnection.addTrack(track, streamRef.current!);
      });

      await peerConnection.setRemoteDescription(offer);

      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);

      socket.emit("answer", {
        target: sender,
        answer,
      });
    };

    const handleAnswer = async ({ sender, answer }: { sender: string; answer: RTCSessionDescriptionInit }) => {
      const peerConnection = peerConnectionsRef.current[sender];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(answer);
      }
    };

    const handleIceCandidate = async ({ sender, candidate }: { sender: string; candidate: RTCIceCandidateInit }) => {
      const peerConnection = peerConnectionsRef.current[sender];
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      }
    };

    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.disconnect();
    };
  }, [roomId, isMediaReady]);

  useEffect(() => {
    const startMeetingMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        if (audioTrack) audioTrack.enabled = isMicOn;
        if (videoTrack) videoTrack.enabled = isCameraOn;

        setIsMediaReady(true);
      } catch (error) {
        console.error("Meeting media error:", error);
      }
    };

    startMeetingMedia();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (!audioTrack) return;
    audioTrack.enabled = !audioTrack.enabled;
    setIsMicOn(audioTrack.enabled);
  };

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    videoTrack.enabled = !videoTrack.enabled;
    setIsCameraOn(videoTrack.enabled);
  };

  const leaveMeeting = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    navigate("/");
  };

  const toggleSidebar = (tab: 'chat' | 'participants') => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setIsSidebarOpen(true);
      setActiveTab(tab);
    }
  };

  const allParticipants = [
    {
      id: "local",
      stream: streamRef.current,
      isLocal: true,
      name: name,
      isCameraOn: isCameraOn,
      isMicOn: isMicOn,
    },
    ...Object.entries(remoteStreams).map(([id, stream]) => ({
      id,
      stream,
      isLocal: false,
      name: `User ${id.substring(0, 4)}`,
      isCameraOn: stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled,
      isMicOn: stream.getAudioTracks().length > 0 && stream.getAudioTracks()[0].enabled,
    }))
  ];

  const participantCount = allParticipants.length;

  const renderGrid = () => {
    if (participantCount === 1) {
      return (
        <div className="h-full w-full p-4 flex items-center justify-center">
          <ParticipantVideo participant={allParticipants[0]} className="w-full max-w-5xl aspect-video rounded-3xl" />
        </div>
      );
    }
    
    if (participantCount === 2) {
      return (
        <div className="h-full w-full p-4 flex flex-col md:flex-row gap-4 items-center justify-center">
          <ParticipantVideo participant={allParticipants[0]} className="w-full md:w-1/2 h-full max-h-[70vh] rounded-3xl" />
          <ParticipantVideo participant={allParticipants[1]} className="w-full md:w-1/2 h-full max-h-[70vh] rounded-3xl" />
        </div>
      );
    }

    if (participantCount === 3) {
      return (
        <div className="h-full w-full p-4 flex flex-col gap-4 justify-center items-center">
          <div className="flex w-full h-[calc(50%-0.5rem)] gap-4 justify-center max-w-6xl">
            <ParticipantVideo participant={allParticipants[0]} className="w-1/2 h-full rounded-3xl" />
            <ParticipantVideo participant={allParticipants[1]} className="w-1/2 h-full rounded-3xl" />
          </div>
          <div className="flex w-full h-[calc(50%-0.5rem)] gap-4 justify-center max-w-6xl">
            <ParticipantVideo participant={allParticipants[2]} className="w-1/2 h-full rounded-3xl" />
          </div>
        </div>
      );
    }
    
    // 4 or more participants
    return (
      <div className="h-full w-full p-4 flex flex-col gap-4">
        <div className="flex-1 w-full flex justify-center min-h-0">
          <ParticipantVideo participant={allParticipants[0]} className="h-full w-full max-w-6xl rounded-3xl" />
        </div>
        <div className="h-32 sm:h-40 md:h-48 w-full flex gap-4 overflow-x-auto justify-center shrink-0 px-2">
          {allParticipants.slice(1).map(p => (
            <ParticipantVideo key={p.id} participant={p} className="h-full aspect-video shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="flex h-screen flex-col bg-[#161618] text-white overflow-hidden font-display">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 z-10 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center gap-4">
          <button onClick={leaveMeeting} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-semibold text-lg tracking-wide hidden sm:block">
            Product Design Meeting
          </h1>
          <span className="bg-white/10 text-white/80 text-xs px-2 py-1 rounded-md sm:hidden">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-3">
           <div className="hidden sm:flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full text-sm">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              {roomId}
           </div>
           <button className="flex items-center gap-2 px-4 py-2 bg-[#00C853] hover:bg-[#00E676] text-black border-[2px] border-black rounded-full text-sm font-bold transition-all shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">
             <Share size={16} />
             <span className="hidden sm:inline">Share Link</span>
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 w-full px-2 sm:px-4 pb-2 gap-4">
        
        {/* Video Grid */}
        <section className="flex-1 relative z-0 flex items-center justify-center overflow-hidden">
          {renderGrid()}
        </section>

        {/* Sidebar */}
        {isSidebarOpen && (
          <aside className="w-80 bg-[#1F1F23] rounded-3xl overflow-hidden flex flex-col border border-white/5 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <h2 className="font-semibold">{activeTab === 'chat' ? 'In-call Messages' : 'Participants'}</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 rounded-md hover:bg-white/10 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {activeTab === 'chat' ? (
                <>
                  <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#00C853] to-[#00E676] border-[2px] border-black shrink-0 flex items-center justify-center">
                       <div className="w-4 h-1 bg-black rounded-b-full"></div>
                     </div>
                     <div>
                       <div className="text-sm font-medium">Maddison Beer</div>
                       <div className="text-sm text-white/70 bg-white/5 p-2 rounded-lg rounded-tl-none mt-1">Hello Guyss👋<br/>Glad to see you again!</div>
                     </div>
                  </div>
                  <div className="flex gap-3">
                     <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-500 shrink-0"></div>
                     <div>
                       <div className="text-sm font-medium">Nanda Pradipto</div>
                       <div className="text-sm text-white/70 bg-white/5 p-2 rounded-lg rounded-tl-none mt-1">Haii madison<br/>How are uu?</div>
                     </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-3">
                  {allParticipants.map(p => (
                    <div key={p.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#00C853] to-[#00E676] border-[2px] border-black text-xs font-bold text-black">
                           {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{p.name} {p.isLocal ? "(You)" : ""}</span>
                      </div>
                      <div className="flex gap-2 text-white/50">
                        {p.isMicOn ? <Mic size={16} /> : <MicOff size={16} className="text-red-400" />}
                        {p.isCameraOn ? <Video size={16} /> : <VideoOff size={16} className="text-red-400" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeTab === 'chat' && (
              <div className="p-4 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="w-full bg-black/40 border border-white/10 rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#00C853] text-black border-[2px] border-black rounded-full hover:bg-[#00E676] transition-colors">
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Controls Bar */}
      <div className="pb-6 pt-2 w-full flex justify-center z-10 px-4">
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-[#1F1F23]/90 backdrop-blur-xl rounded-full border border-white/10 shadow-2xl overflow-x-auto">
           <button
             onClick={toggleMic}
             className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full transition-all ${
               isMicOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500 hover:bg-red-600 text-white"
             }`}
           >
             {isMicOn ? <Mic size={20} /> : <MicOff size={20} />}
           </button>
           
           <button
             onClick={toggleCamera}
             className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full transition-all ${
               isCameraOn ? "bg-white/10 hover:bg-white/20 text-white" : "bg-red-500 hover:bg-red-600 text-white"
             }`}
           >
             {isCameraOn ? <Video size={20} /> : <VideoOff size={20} />}
           </button>

           <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2 shrink-0"></div>

           <button 
             onClick={() => toggleSidebar('participants')}
             className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full transition-all ${isSidebarOpen && activeTab === 'participants' ? 'bg-[#00C853] text-black border-[2px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-white/10 hover:bg-white/20 text-white'}`}
           >
             <Users size={20} />
           </button>
           
           <button 
             onClick={() => toggleSidebar('chat')}
             className={`flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full transition-all ${isSidebarOpen && activeTab === 'chat' ? 'bg-[#00C853] text-black border-[2px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]' : 'bg-white/10 hover:bg-white/20 text-white'}`}
           >
             <MessageSquare size={20} />
           </button>

           <button className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
             <MoreVertical size={20} />
           </button>

           <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2 shrink-0"></div>

           <button
             onClick={leaveMeeting}
             className="flex items-center gap-2 h-10 sm:h-12 px-4 sm:px-6 shrink-0 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all font-medium"
           >
             <PhoneOff size={20} />
             <span className="hidden sm:inline">Leave</span>
           </button>
        </div>
      </div>
    </main>
  );
}