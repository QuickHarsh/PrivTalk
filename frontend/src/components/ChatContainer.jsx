import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import { Download } from "lucide-react";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();
  const { authUser } = useAuthStore();
  const messageEndRef = useRef(null);

  useEffect(() => {
    if (selectedUser?._id) {
      getMessages(selectedUser._id);
      subscribeToMessages();
    }

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser?._id, getMessages, subscribeToMessages, unsubscribeFromMessages]);

  useEffect(() => {
    if (messageEndRef.current && messages) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDownload = async (url, fileName) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message._id}
            className={`flex ${message.senderID === authUser._id ? "justify-end" : "justify-start"}`}
            ref={messageEndRef}
          >
            <div className={`chat ${message.senderID === authUser._id ? "chat-end" : "chat-start"}`}>
              <div className="chat-image avatar">
                <div className="w-10 h-10 rounded-full border">
                  <img
                    src={
                      message.senderID === authUser._id
                        ? authUser.profilePic || "/avatar.png"
                        : selectedUser.profilePic || "/avatar.png"
                    }
                    alt="profile pic"
                  />
                </div>
              </div>
              <div className="chat-header">
                {message.senderID === authUser._id ? authUser.fullName : selectedUser.fullName}
                <time className="text-xs opacity-50 ml-1">
                  {formatMessageTime(message.createdAt)}
                </time>
              </div>
              <div className={`chat-bubble ${message.senderID === authUser._id ? "chat-bubble-primary" : ""}`}>
                {message.fileType === "image" && message.image && (
                  <div className="relative">
                    <img
                      src={message.image}
                      alt="Attachment"
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                    <button
                      onClick={() => handleDownload(message.image, message.fileName)}
                      className="absolute top-2 right-2 btn btn-circle btn-sm bg-base-100/80 hover:bg-base-100"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )}
                {message.fileType === "video" && message.video && (
                  <div className="relative">
                    <video
                      src={message.video}
                      controls
                      className="sm:max-w-[200px] rounded-md mb-2"
                    />
                    <button
                      onClick={() => handleDownload(message.video, message.fileName)}
                      className="absolute top-2 right-2 btn btn-circle btn-sm bg-base-100/80 hover:bg-base-100"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                )}
                {message.text && <p>{message.text}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <MessageInput />
    </div>
  );
};

export default ChatContainer;