import ChatConversationScreen from "../screens/ChatScreens/ChatMessages";
import { useNavBarControls } from "../contexts/NavBarContext";

export default function ChatMessagesRoute() {
  const { setNavBarVariant } = useNavBarControls();
  return <ChatConversationScreen setNavBarVariant={setNavBarVariant} />;
}
