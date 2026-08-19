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
  Send,
  Pencil
} from "lucide-react";

import { socket } from "../socket";
import Whiteboard from "../components/Whiteboard";

type MeetingState = {
  name?: string;
  isMicOn?: boolean;
  isCameraOn?: boolean;
};

const ParticipantVideo = ({ participant, className = "" }: { participant: any, className?: string }) => {
  return (
    <div className={`relative overflow-hidden bg-white border-[4px] border-black shadow-[8px_8px_0_0_rgba(0,0,0,1)] group flex items-center justify-center ${className}`}>
      {participant.isCameraOn ? (
        <video
          autoPlay
          playsInline
          muted={participant.isLocal}
          ref={(el) => {
            if (el && participant.stream && el.srcObject !== participant.stream) {
              el.srcObject = participant.stream;
            }
          }}
          className={`h-full w-full object-cover ${participant.isLocal ? 'scale-x-[-1]' : ''}`}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#F4F0E6] group overflow-hidden">
           {/* Frog Avatar */}
           <div className="flex h-20 w-20 sm:h-28 sm:w-28 flex-col items-center justify-center rounded-t-full bg-[#00C853] text-2xl sm:text-4xl font-semibold text-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] relative border-[3px] border-black transition-transform group-hover:scale-110 mt-6">
             <div className="absolute -top-4 left-0 w-8 h-8 bg-white rounded-full border-[3px] border-black flex items-center justify-center"><div className="w-3 h-3 bg-black rounded-full mt-1"></div></div>
             <div className="absolute -top-4 right-0 w-8 h-8 bg-white rounded-full border-[3px] border-black flex items-center justify-center"><div className="w-3 h-3 bg-black rounded-full mt-1"></div></div>
             <div className="z-10 font-display">{participant.name.charAt(0).toUpperCase()}</div>
             <div className="absolute bottom-3 w-10 h-4 bg-black rounded-b-full flex justify-center overflow-hidden"><div className="w-4 h-3 bg-[#FF0055] rounded-t-full translate-y-2 group-hover:translate-y-1 transition-transform"></div></div>
           </div>
        </div>
      )}

      {/* Name and Mic Status Badge */}
      <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 z-10 flex items-center gap-2 rounded-none bg-white px-2 py-1 sm:px-3 sm:py-1.5 border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] max-w-[calc(100%-1rem)] overflow-hidden">
        {!participant.isMicOn ? (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FF3300] border-[2px] border-black text-white">
            <MicOff size={12} />
          </div>
        ) : (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#00E676] border-[2px] border-black text-black">
             <Mic size={12} />
          </div>
        )}
        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-black font-display truncate">
          {participant.name} {participant.isLocal ? "(You)" : ""}
        </span>
      </div>

      {/* Top right floating actions */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
         {participant.isLocal && (
          <div className="flex items-center gap-1 rounded-none bg-[#0055FF] px-2 py-1 sm:px-3 sm:py-1.5 text-xs font-bold uppercase tracking-wider text-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
            Host <Pin size={12} className="ml-1" />
          </div>
         )}
         <button className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-none bg-white text-black border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-colors">
           <Maximize size={16} />
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
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});

  const [isMicOn, setIsMicOn] = useState(state?.isMicOn ?? true);
  const [isCameraOn, setIsCameraOn] = useState(state?.isCameraOn ?? true);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
  const [isMediaReady, setIsMediaReady] = useState(false);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('chat');
  const [isWhiteboardOpen, setIsWhiteboardOpen] = useState(false);

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
      setRemoteStreams((prev) => {
        const existingStream = prev[targetUserId];
        let stream = existingStream;
        
        if (event.streams && event.streams.length > 0) {
          stream = event.streams[0];
        } else if (!stream) {
          stream = new MediaStream([event.track]);
        } else {
          stream.addTrack(event.track);
        }
          
        return {
          ...prev,
          [targetUserId]: stream,
        };
      });
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

      const peerConnection = createPeerConnection(userId);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, streamRef.current!);
        });
      } else {
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      }

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      socket.emit("offer", {
        target: userId,
        offer,
      });
    };

    const handleOffer = async ({ sender, offer }: { sender: string; offer: RTCSessionDescriptionInit }) => {
      const peerConnection = createPeerConnection(sender);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          peerConnection.addTrack(track, streamRef.current!);
        });
      }

      await peerConnection.setRemoteDescription(offer);
      
      // Process any queued ICE candidates for this sender
      if (pendingCandidatesRef.current[sender]) {
        for (const candidate of pendingCandidatesRef.current[sender]) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
        pendingCandidatesRef.current[sender] = [];
      }

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
        
        // Process any queued ICE candidates for this sender
        if (pendingCandidatesRef.current[sender]) {
          for (const candidate of pendingCandidatesRef.current[sender]) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }
          pendingCandidatesRef.current[sender] = [];
        }
      }
    };

    const handleIceCandidate = async ({ sender, candidate }: { sender: string; candidate: RTCIceCandidateInit }) => {
      const peerConnection = peerConnectionsRef.current[sender];
      
      if (peerConnection && peerConnection.remoteDescription) {
        try {
          await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding received ice candidate", e);
        }
      } else {
        // Queue candidates if the remote description isn't set yet (prevent InvalidStateError)
        if (!pendingCandidatesRef.current[sender]) {
          pendingCandidatesRef.current[sender] = [];
        }
        pendingCandidatesRef.current[sender].push(candidate);
      }
    };

    const handleUserDisconnected = (userId: string) => {
      console.log("User disconnected:", userId);
      
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
      }
      
      setRemoteStreams((prev) => {
        const newStreams = { ...prev };
        delete newStreams[userId];
        return newStreams;
      });
      
      if (pendingCandidatesRef.current[userId]) {
        delete pendingCandidatesRef.current[userId];
      }
    };

    socket.on("connect", handleConnect);
    socket.on("user-joined", handleUserJoined);
    socket.on("user-disconnected", handleUserDisconnected);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("user-disconnected", handleUserDisconnected);
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
      } catch (error) {
        console.error("Meeting media error:", error);
        setIsCameraOn(false);
        setIsMicOn(false);
      } finally {
        setIsMediaReady(true);
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
        <div className="h-full w-full p-4 sm:p-6 md:p-8 flex items-center justify-center min-h-0">
          <ParticipantVideo participant={allParticipants[0]} className="w-full h-full max-w-5xl max-h-[80vh] aspect-video rounded-3xl" />
        </div>
      );
    }
    
    if (participantCount === 2) {
      return (
        <div className="h-full w-full p-4 sm:p-6 flex flex-col md:flex-row gap-4 sm:gap-6 items-center justify-center min-h-0">
          <ParticipantVideo participant={allParticipants[0]} className="w-full md:w-1/2 h-full max-h-[40vh] md:max-h-[70vh] rounded-3xl" />
          <ParticipantVideo participant={allParticipants[1]} className="w-full md:w-1/2 h-full max-h-[40vh] md:max-h-[70vh] rounded-3xl" />
        </div>
      );
    }

    if (participantCount === 3) {
      return (
        <div className="h-full w-full p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 justify-center items-center min-h-0">
          <div className="flex w-full h-[calc(50%-0.5rem)] gap-4 sm:gap-6 justify-center max-w-6xl min-h-0">
            <ParticipantVideo participant={allParticipants[0]} className="w-1/2 h-full max-h-[40vh] rounded-3xl" />
            <ParticipantVideo participant={allParticipants[1]} className="w-1/2 h-full max-h-[40vh] rounded-3xl" />
          </div>
          <div className="flex w-full h-[calc(50%-0.5rem)] gap-4 sm:gap-6 justify-center max-w-6xl min-h-0">
            <ParticipantVideo participant={allParticipants[2]} className="w-1/2 h-full max-h-[40vh] rounded-3xl" />
          </div>
        </div>
      );
    }
    
    // 4 or more participants
    return (
      <div className="h-full w-full p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 min-h-0 overflow-hidden">
        <div className="flex-1 w-full flex justify-center min-h-0">
          <ParticipantVideo participant={allParticipants[0]} className="h-full w-full max-w-6xl max-h-[60vh] rounded-3xl" />
        </div>
        <div className="h-32 sm:h-40 md:h-48 w-full flex gap-4 sm:gap-6 overflow-x-auto justify-center shrink-0 px-2 pb-4">
          {allParticipants.slice(1).map(p => (
            <ParticipantVideo key={p.id} participant={p} className="h-full aspect-video shrink-0 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  };

  return (
    <main className="flex h-screen flex-col bg-[#F4F0E6] text-[#111111] overflow-hidden font-display selection:bg-[#FF3300] selection:text-white">
      
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 z-10 border-b-[4px] border-black bg-white relative">
        <div className="flex items-center gap-4">
          <button onClick={leaveMeeting} className="p-2 border-[3px] border-black rounded-full bg-white hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-xl tracking-wide hidden sm:block uppercase">
            FrogMeet
          </h1>
          <span className="bg-[#FF0055] text-white border-[2px] border-black font-bold uppercase tracking-widest text-xs px-2 py-1 rounded-none shadow-[2px_2px_0_0_rgba(0,0,0,1)] sm:hidden">
            {roomId}
          </span>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden sm:flex items-center gap-2 bg-white border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] px-4 py-2 text-sm font-bold uppercase tracking-wider">
              <span className="w-3 h-3 rounded-full bg-[#00E676] border-[2px] border-black animate-pulse"></span>
              ROOM: {roomId}
           </div>
           <button className="flex items-center gap-2 px-6 py-2 bg-[#0055FF] hover:bg-black text-white border-[3px] border-black text-sm font-bold uppercase tracking-wider transition-all shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1">
             <Share size={18} />
             <span className="hidden sm:inline">Share Link</span>
           </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 min-h-0 w-full p-4 gap-6">
        
        {/* Video Grid or Whiteboard */}
        {isWhiteboardOpen ? (
          <div className="flex-1 flex gap-4 min-h-0 h-full overflow-hidden">
            {/* Whiteboard Workspace */}
            <section className="flex-1 relative z-0 flex items-center justify-center bg-[#F4F0E6] overflow-hidden">
              <Whiteboard />
            </section>
            
            {/* Mini Video Strip */}
            <aside className="w-48 sm:w-64 flex flex-col gap-4 overflow-y-auto pr-2 pb-2 h-full z-10 shrink-0">
               {allParticipants.map(p => (
                 <ParticipantVideo key={p.id} participant={p} className="w-full aspect-video rounded-2xl shrink-0" />
               ))}
            </aside>
          </div>
        ) : (
          <section className="flex-1 relative z-0 flex items-center justify-center overflow-hidden">
            {renderGrid()}
          </section>
        )}

        {/* Sidebar */}
        {isSidebarOpen && (
          <aside className="w-96 bg-white border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] flex flex-col transition-all overflow-hidden h-full z-20">
            
            <div className="flex items-center justify-between p-4 border-b-[4px] border-black bg-[#F4F0E6]">
              <h2 className="font-bold text-xl uppercase tracking-wider">
                {activeTab === 'chat' ? 'Real-Time Chat' : 'Participants'}
              </h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-1 border-[2px] border-black bg-white hover:bg-[#FF3300] hover:text-white transition-colors shadow-[2px_2px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 bg-white">
              {activeTab === 'chat' ? (
                <>
                  <div className="flex gap-4">
                     <div className="w-12 h-12 rounded-full bg-[#FF0055] border-[3px] border-black shrink-0 flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden relative">
                       <div className="absolute top-2 left-2 w-3 h-3 bg-white rounded-full border-2 border-black"></div>
                       <div className="absolute top-2 right-2 w-3 h-3 bg-white rounded-full border-2 border-black"></div>
                       <div className="absolute bottom-2 w-6 h-3 bg-black rounded-b-full border-2 border-black"></div>
                     </div>
                     <div className="flex-1">
                       <div className="text-sm font-bold uppercase tracking-wider mb-1 text-black">Maddison Beer</div>
                       <div className="text-md font-medium text-black bg-[#00E676] border-[3px] border-black p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] relative before:content-[''] before:absolute before:-left-[11px] before:top-3 before:border-[6px] before:border-transparent before:border-r-black after:content-[''] after:absolute after:-left-[5px] after:top-[15px] after:border-[3px] after:border-transparent after:border-r-[#00E676]">
                         Hello Guyss👋<br/>Glad to see you again!
                       </div>
                     </div>
                  </div>
                  <div className="flex gap-4 flex-row-reverse">
                     <div className="w-12 h-12 rounded-full bg-[#0055FF] border-[3px] border-black shrink-0 flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden relative">
                       <div className="absolute top-3 left-1/2 -translate-x-1/2 w-6 h-2 bg-black"></div>
                       <div className="absolute bottom-3 w-6 h-3 bg-white border-2 border-black"></div>
                     </div>
                     <div className="flex-1 flex flex-col items-end">
                       <div className="text-sm font-bold uppercase tracking-wider mb-1 text-black">Nanda Pradipto</div>
                       <div className="text-md font-medium text-black bg-[#F4F0E6] border-[3px] border-black p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] text-left relative before:content-[''] before:absolute before:-right-[11px] before:top-3 before:border-[6px] before:border-transparent before:border-l-black after:content-[''] after:absolute after:-right-[5px] after:top-[15px] after:border-[3px] after:border-transparent after:border-l-[#F4F0E6]">
                         Haii madison<br/>How are uu?
                       </div>
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="w-12 h-12 rounded-full bg-white border-[3px] border-black shrink-0 flex items-center justify-center shadow-[4px_4px_0_0_rgba(0,0,0,1)] overflow-hidden relative">
                       <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
                         <div className="w-4 h-4 bg-white rounded-full -translate-y-1 translate-x-1"></div>
                       </div>
                     </div>
                     <div className="flex-1">
                       <div className="text-sm font-bold uppercase tracking-wider mb-1 text-black">You</div>
                       <div className="text-md font-medium text-white bg-[#FF3300] border-[3px] border-black p-3 shadow-[4px_4px_0_0_rgba(0,0,0,1)] relative before:content-[''] before:absolute before:-left-[11px] before:top-3 before:border-[6px] before:border-transparent before:border-r-black after:content-[''] after:absolute after:-left-[5px] after:top-[15px] after:border-[3px] after:border-transparent after:border-r-[#FF3300]">
                         Doing great! Ready to review the new designs.
                       </div>
                     </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-4">
                  {allParticipants.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-[#F4F0E6] p-3 border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center bg-[#00E676] border-[2px] border-black text-lg font-bold text-black shadow-[2px_2px_0_0_rgba(0,0,0,1)]">
                           {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-bold uppercase tracking-wider">{p.name} {p.isLocal ? "(You)" : ""}</span>
                      </div>
                      <div className="flex gap-3">
                        <div className={`w-8 h-8 rounded-none border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${p.isMicOn ? 'bg-white text-black' : 'bg-[#FF3300] text-white'}`}>
                           {p.isMicOn ? <Mic size={14} /> : <MicOff size={14} />}
                        </div>
                        <div className={`w-8 h-8 rounded-none border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0_0_rgba(0,0,0,1)] ${p.isCameraOn ? 'bg-white text-black' : 'bg-[#FF3300] text-white'}`}>
                           {p.isCameraOn ? <Video size={14} /> : <VideoOff size={14} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {activeTab === 'chat' && (
              <div className="p-4 border-t-[4px] border-black bg-[#F4F0E6]">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..." 
                    className="flex-1 bg-white border-[3px] border-black py-3 px-4 text-sm font-bold outline-none placeholder:text-zinc-400 shadow-[4px_4px_0_0_rgba(0,0,0,1)] focus:shadow-[6px_6px_0_0_rgba(0,0,0,1)] transition-shadow"
                  />
                  <button className="px-6 bg-[#00E676] text-black border-[3px] border-black hover:bg-black hover:text-white transition-colors shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 font-bold uppercase flex items-center justify-center">
                    <Send size={18} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Floating Controls Bar */}
      <div className="pb-6 pt-2 w-full flex justify-center z-10 px-4">
        <div className="flex items-center gap-4 px-6 py-4 bg-white border-[4px] border-black shadow-[12px_12px_0_0_rgba(0,0,0,1)] overflow-x-auto">
           <button
             onClick={toggleMic}
             className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center transition-all border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
               isMicOn ? "bg-[#00E676] hover:bg-black hover:text-white text-black" : "bg-[#FF3300] hover:bg-black text-white"
             }`}
           >
             {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
           </button>
           
           <button
             onClick={toggleCamera}
             className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center transition-all border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 ${
               isCameraOn ? "bg-[#00E676] hover:bg-black hover:text-white text-black" : "bg-[#FF3300] hover:bg-black text-white"
             }`}
           >
             {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
           </button>

           <div className="w-[4px] h-10 bg-black mx-2 shrink-0"></div>

           <button 
             onClick={() => toggleSidebar('participants')}
             className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center transition-all border-[3px] border-black active:shadow-none active:translate-x-1 active:translate-y-1 ${isSidebarOpen && activeTab === 'participants' ? 'bg-[#0055FF] text-white shadow-none translate-x-1 translate-y-1' : 'bg-[#F4F0E6] hover:bg-black hover:text-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}
           >
             <Users size={24} />
           </button>
           
           <button 
             onClick={() => toggleSidebar('chat')}
             className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center transition-all border-[3px] border-black active:shadow-none active:translate-x-1 active:translate-y-1 ${isSidebarOpen && activeTab === 'chat' ? 'bg-[#0055FF] text-white shadow-none translate-x-1 translate-y-1' : 'bg-[#F4F0E6] hover:bg-black hover:text-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}
           >
             <MessageSquare size={24} />
           </button>

           <button 
             onClick={() => setIsWhiteboardOpen(!isWhiteboardOpen)}
             className={`flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center transition-all border-[3px] border-black active:shadow-none active:translate-x-1 active:translate-y-1 ${isWhiteboardOpen ? 'bg-[#0055FF] text-white shadow-none translate-x-1 translate-y-1' : 'bg-[#F4F0E6] hover:bg-black hover:text-white text-black shadow-[4px_4px_0_0_rgba(0,0,0,1)]'}`}
             title="Toggle Whiteboard"
           >
             <Pencil size={24} />
           </button>

           <div className="w-[4px] h-10 bg-black mx-2 shrink-0"></div>

           <button className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center bg-[#F4F0E6] hover:bg-black hover:text-white text-black border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
             <MoreVertical size={24} />
           </button>

           <div className="w-[4px] h-10 bg-black mx-2 shrink-0"></div>

           <button
             onClick={leaveMeeting}
             className="flex items-center gap-2 h-12 sm:h-14 px-6 sm:px-8 shrink-0 bg-[#FF0055] hover:bg-black text-white transition-all font-bold uppercase tracking-wider border-[3px] border-black shadow-[6px_6px_0_0_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1"
           >
             <PhoneOff size={24} />
             <span className="hidden sm:inline">Leave</span>
           </button>
        </div>
      </div>
    </main>
  );
}