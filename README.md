# Project Setup Guide

Follow the steps below to set up and work with this project effectively:

---

## Initial Setup (NOTE: Please don't forget regularly git pulling)

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   ```

2. **Navigate to the Project Directory**
   ```bash
   cd <project-folder>
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Run the App**
   - For Android:
     ```bash
     npx expo run:android
     ```
   - For iOS:
     ```bash
     npx expo run:ios
     ```

5. **Development Server**
   Start the Expo development server:
   ```bash
   npx expo start
   ```

---

## Project Guidelines

### 1. **Colors**
   - All colors, including black and white, should be imported from the `design-system/colors.tsx` file.
   - Example:
     ```tsx
     import { AppColors } from '../design-system/colors';

     const styles = StyleSheet.create({
       container: {
         backgroundColor: AppColors.primaryLightGreen,
       },
       text: {
         color: AppColors.basicWhite,
       },
     });
     ```

### 2. **API Integration**
   - All API calls should go through the `ApiUtil` wrapper function.
   - The `ApiUtil` function ensures universal error handling and consistent API requests.
   - Example:
     ```tsx
     import ApiUtil from '../utils/ApiUtil';

     const fetchData = async () => {
       try {
         const response = await ApiUtil('/endpoint', {
           method: 'GET',
         });
         console.log(response);
       } catch (error) {
         console.error('API Error:', error);
       }
     };
     ```

---

## Folder Structure

```
project-root/
  ├── components/       # Reusable components
  ├── screens/          # Screens for the app
  ├── design-system/    # Design tokens (e.g., colors, typography)
  │   ├── colors.tsx    # Centralized color definitions
  ├── utils/            # Utility functions (e.g., ApiUtil)
  ├── navigation/       # Navigation configuration
  ├── assets/           # Static assets (e.g., images, fonts)
  ├── App.tsx           # Entry point
```

---

## Additional Notes

1. **Branching and Commits**
   - Follow the team’s Git branching strategy.
   - Use meaningful commit messages.

2. **Code Consistency**
   - Use linting and Prettier configurations provided in the project.
   - Ensure all code adheres to the established coding standards.

3. **Error Handling**
   - Use the `ApiUtil` function to catch and handle errors globally.
   - Avoid inline error handling except in special cases.

4. **Contribution**
   - Ensure all new components follow the established guidelines in the `components` folder.
   - Document any new utilities or major features in the `docs` folder.

---

Feel free to reach out to the project maintainer for any clarifications or issues.
