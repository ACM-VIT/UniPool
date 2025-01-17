## Components Folder
The `components` folder contains all reusable components. Please add all the components made to this readme, right below the folder structure. Follow these guidelines to ensure consistency and maintainability:

### Folder Structure
Each component should reside in its own folder named after the component. For example:

```
components/
  Button/
    Button.tsx
    Button.styles.ts
    Button.types.ts
    index.ts
```

### Components list
1. **PreviousTripsCompressed**: A compressed view card of the previous trips, to show under "your trips" on the home page as of now. Takes a singular Ride as its prop.
2. **MainNavBar**: The main navigation bar that is present on all screens, around which the app revolves. Takes props to decide the icons, and the state of the navbar.
3. **RideDetailsSelector**: A component that allows the user to select the details of the ride they want to book. Takes an onSubmit function as it's prop. Will be used in the booking flow.


### Component Writing Guidelines
1. **File Naming:** Use PascalCase for component names (e.g., `Button.tsx`).
2. **Props Interface:** Define an interface for the component's props in a separate `types.ts` or within the same file if the props are minimal.
3. **Styling:** Use a separate `styles.ts` file for styles, and prefer `StyleSheet.create` for consistency.
4. **Index File:** Export the component from an `index.ts` file for easy imports.
5. **Comments and Documentation:**
   - Add comments for all props in the interface.
   - Mention whether a prop is required or optional.

### Example Component Structure
#### Button.tsx
```tsx
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { ButtonProps } from './Button.types';
import styles from './Button.styles';

const Button: React.FC<ButtonProps> = ({ label, onPress, disabled }) => {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={disabled}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
};

export default Button;
```

#### Button.types.ts
```tsx
export interface ButtonProps {
  label: string; // Text to display on the button
  onPress: () => void; // Callback for button press
  disabled?: boolean; // Disable the button (optional)
}
```

#### Button.styles.ts
```tsx
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'blue',
    padding: 10,
    borderRadius: 5,
  },
  label: {
    color: 'white',
    textAlign: 'center',
  },
});

export default styles;
```

#### index.ts
```tsx
export { default } from './Button';
```
