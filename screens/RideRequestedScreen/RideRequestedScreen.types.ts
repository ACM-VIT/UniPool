import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/RootStackParamList";


export type RideCreateScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "RideRequestedScreen"
> & {
  setNavBarVariant?: (v: 0 | 1 | 2) => void;
};
