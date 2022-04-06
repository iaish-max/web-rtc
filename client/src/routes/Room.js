import React, { useRef, useEffect, useState } from "react";
import io from "socket.io-client";

const Room = (props) => {
  const userVideo = useRef();
  const partnerVideo = useRef();
  const peerRef = useRef();
  const socketRef = useRef();
  const otherUser = useRef();
  const userStream = useRef();
  const senders = useRef([]);

  const sendChannel = useRef();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState([]);

  //add
  const [peerJoined, setPeerJoined] = useState(false);
  //add

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream) => {
        userVideo.current.srcObject = stream;
        userStream.current = stream;

        socketRef.current = io.connect("/");
        socketRef.current.emit("join room", props.match.params.roomID);

        socketRef.current.on("other user", (userID) => {
          callUser(userID);
          otherUser.current = userID;
        });

        socketRef.current.on("user joined", (userID) => {
          otherUser.current = userID;
        });

        socketRef.current.on("offer", handleRecieveCall);

        socketRef.current.on("answer", handleAnswer);

        socketRef.current.on("ice-candidate", handleNewICECandidateMsg);

        //add
        socketRef.current.on("user left", () => {
          //   peerRef.current.destroy();

          // if (userVideo.srcObject) {
          //   userVideo.srcObject.getTracks().forEach((track) => {
          //     track.stop();
          //   });
          // }

          // if (partnerVideo.srcObject) {
          //   partnerVideo.srcObject.getTracks().forEach((track) => {
          //     track.stop();
          //   });
          // }

          if (peerRef.current) {
            peerRef.current.ontrack = null;
            peerRef.current.onicecandidate = null;
            peerRef.current.close();
            peerRef.current = null;
          }

          setPeerJoined(false);
          console.log("user left called");

          senders.current = [];
        });
        //add
      });
  }, []);

  function callUser(userID) {
    peerRef.current = createPeer(userID);
    userStream.current
      .getTracks()
      .forEach((track) =>
        senders.current.push(
          peerRef.current.addTrack(track, userStream.current)
        )
      );

    //add
    sendChannel.current = peerRef.current.createDataChannel("sendChannel");
    sendChannel.current.onmessage = handleReceiveMessage;
    //add
  }

  //add
  function handleReceiveMessage(e) {
    setMessages((messages) => [...messages, { yours: false, value: e.data }]);
  }
  //add

  function createPeer(userID) {
    const peer = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.stunprotocol.org",
        },
        {
          urls: "turn:numb.viagenie.ca",
          credential: "muazkh",
          username: "webrtc@live.com",
        },
      ],
    });

    peer.onicecandidate = handleICECandidateEvent;
    peer.ontrack = handleTrackEvent;
    peer.onnegotiationneeded = () => handleNegotiationNeededEvent(userID);

    return peer;
  }

  function handleNegotiationNeededEvent(userID) {
    peerRef.current
      .createOffer()
      .then((offer) => {
        return peerRef.current.setLocalDescription(offer);
      })
      .then(() => {
        const payload = {
          target: userID,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription,
        };
        socketRef.current.emit("offer", payload);
      })
      .catch((e) => console.log(e));
  }

  function handleRecieveCall(incoming) {
    peerRef.current = createPeer();

    // add
    peerRef.current.ondatachannel = (event) => {
      sendChannel.current = event.channel;
      sendChannel.current.onmessage = handleReceiveMessage;
    };
    // add

    const desc = new RTCSessionDescription(incoming.sdp);
    peerRef.current
      .setRemoteDescription(desc)
      .then(() => {
        userStream.current
          .getTracks()
          .forEach((track) =>
            senders.current.push(
              peerRef.current.addTrack(track, userStream.current)
            )
          );
      })
      .then(() => {
        return peerRef.current.createAnswer();
      })
      .then((answer) => {
        return peerRef.current.setLocalDescription(answer);
      })
      .then(() => {
        const payload = {
          target: incoming.caller,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription,
        };
        socketRef.current.emit("answer", payload);
      });
  }

  function handleAnswer(message) {
    const desc = new RTCSessionDescription(message.sdp);
    peerRef.current.setRemoteDescription(desc).catch((e) => console.log(e));
  }

  function handleICECandidateEvent(e) {
    if (e.candidate) {
      const payload = {
        target: otherUser.current,
        candidate: e.candidate,
      };
      socketRef.current.emit("ice-candidate", payload);
    }
  }

  function handleNewICECandidateMsg(incoming) {
    const candidate = new RTCIceCandidate(incoming);

    peerRef.current.addIceCandidate(candidate).catch((e) => console.log(e));
  }

  function handleTrackEvent(e) {
    //add
    setPeerJoined(true);
    //add
    partnerVideo.current.srcObject = e.streams[0];
  }

  function shareScreen() {
    navigator.mediaDevices.getDisplayMedia({ cursor: true }).then((stream) => {
      const screenTrack = stream.getTracks()[0];

      console.log("senders.current is: ", senders.current);

      senders.current
        .find((sender) => sender.track.kind === "video")
        .replaceTrack(screenTrack);
      screenTrack.onended = function () {
        senders.current
          .find((sender) => sender.track.kind === "video")
          .replaceTrack(userStream.current.getTracks()[1]);
      };
    });
  }

  function handleChange(e) {
    setText(e.target.value);
  }

  function sendMessage() {
    sendChannel.current.send(text);
    setMessages((messages) => [...messages, { yours: true, value: text }]);
    setText("");
  }

  function renderMessage(message, index) {
    if (message.yours) {
      return (
        <div key={index}>
          <p>{message.value}</p>
        </div>
      );
    }

    return (
      <div key={index}>
        <p>{message.value}</p>
      </div>
    );
  }

  return (
    <div>
      <div>
        <video
          muted
          controls
          style={{ height: 500, width: 500 }}
          autoPlay
          ref={userVideo}
        />
        {peerJoined && (
          <video
            controls
            style={{ height: 500, width: 500 }}
            autoPlay
            ref={partnerVideo}
          />
        )}
        <button onClick={shareScreen}>Share screen</button>
      </div>

      <div style={{ margin: "40px" }}>
        <div className="message-box">
          <div>{messages.map(renderMessage)}</div>
        </div>
        <input
          value={text}
          type="text"
          placeholder="say something..."
          onChange={handleChange}
        ></input>
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Room;
