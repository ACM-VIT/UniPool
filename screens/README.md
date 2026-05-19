## Screens Folder
The `screens` folder contains the final screens of the app. These should integrate the components created in the `components` folder.

### Folder Structure
Each screen should have its own folder named after the screen. For example:

```
screens/
  HomeScreen/
    HomeScreen.tsx
    HomeScreen.styles.ts
    HomeScreen.types.ts
    index.ts
```

### Screen Writing Guidelines
1. **File Naming:** Use PascalCase for screen names (e.g., `HomeScreen.tsx`).
2. **Integration:** Reuse components from the `components` folder wherever possible.
3. **Props and Navigation:**
   - Define a `ScreenProps` interface for the screen's props in the `types.ts` file.
   - Use the Expo Router compatibility types from `navigation/router-compat` for legacy screen props.
4. **Styling:** Use a separate `styles.ts` file for styles.
5. **Index File:** Export the screen from an `index.ts` file.

### Example Screen Structure
#### HomeScreen.tsx
```tsx
import React from 'react';
import { View } from 'react-native';
import { HomeScreenProps } from './HomeScreen.types';
import styles from './HomeScreen.styles';
import Button from '../../components/Button';

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Button
        label="Go to Details"
        onPress={() => navigation.navigate('DetailsScreen')}
      />
    </View>
  );
};

export default HomeScreen;
```

#### HomeScreen.types.ts
```tsx
import { NativeStackScreenProps } from '../../navigation/router-compat';
import { RootStackParamList } from '../../navigation/types';

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'HomeScreen'>;
```

#### HomeScreen.styles.ts
```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
});

export default styles;
```

#### index.ts
```tsx
export { default } from './HomeScreen';
```
