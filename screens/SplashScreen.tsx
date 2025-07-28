import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from "react-native";
import Svg, { G, Path, Defs, ClipPath, Rect } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Design dimensions
const DESIGN_WIDTH = 710.67;
const DESIGN_HEIGHT = 1524;

// Scale factors for responsive design
const scaleX = screenWidth / DESIGN_WIDTH;
const scaleY = screenHeight / DESIGN_HEIGHT;
const scale = Math.min(scaleX, scaleY);

const SplashScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Car Outline Vector */}
      <View style={[styles.carOutlineContainer, {
        left: 80 * scaleX,
        top: 480 * scaleY,
      }]}>
        <Svg 
          width={517 * scaleX} 
          height={311 * scaleY} 
          viewBox="0 0 517 311" 
          fill="none"
        >
          <Path 
            d="M2.54053 296.514V14.3514C2.54053 7.42541 8.15509 1.81082 15.081 1.81082H367.437C373.661 1.81082 378.943 6.37562 379.845 12.5338L403.071 171.089C403.973 177.247 409.255 181.812 415.479 181.812H492.211C498.636 181.812 504.022 186.669 504.684 193.06L515.269 295.221C516.036 302.619 510.233 309.054 502.796 309.054H15.0811C8.15512 309.054 2.54053 303.439 2.54053 296.514Z" 
            stroke="#263B33" 
            strokeWidth="3.13513"
            fill="none"
          />
        </Svg>
      </View>
      
      {/* Logo Text - Properly Aligned */}
      <View style={[styles.logoContainer, {
        left: 70 * scaleX,
        top: 520 * scaleY,
      }]}>
        {/* First Line: Uni - moved up */}
        <Text style={[styles.logoTextLine, { 
          fontSize: 210.74 * scale,
          marginTop: -50 * scale, // Move Uni up more
        }]}>
          <Text style={styles.logoTextDark}>Uni</Text>
        </Text>
        
        {/* Second Line: Pool - P aligned under U with gap */}
        <Text style={[styles.logoTextLine, { 
          fontSize: 210.74 * scale,
          marginTop: 10 * scale, // Positive margin to create more gap
        }]}>
          <Text style={styles.logoTextDark}>P</Text>
          <Text style={styles.logoTextWhite}>oo</Text>
          <Text style={styles.logoTextDark}>l</Text>
        </Text>
      </View>

      {/* Tagline */}
      <Text style={[styles.tagline, {
        left: screenWidth * 0.15,
        top: 950 * scaleY,
        fontSize: 35 * scale,
        textAlign: 'center',
        width: screenWidth * 0.7,
      }]}>
        Share, Commute, Save
      </Text>

      {/* Footer Left */}
      <Text style={[styles.footerText, {
        left: 149 * scaleX,
        top: 1400 * scaleY,
        fontSize: 30.66 * scale,
      }]}>
        Crafted with
      </Text>

      {/* Footer Right */}
      <Text style={[styles.footerText, {
        left: 388.11 * scaleX,
        top: 1400 * scaleY,
        fontSize: 30.66 * scale,
      }]}>
        by ACM-VIT
      </Text>

      {/* Heart SVG */}
      <View style={[styles.heartContainer, {
        left: 338 * scaleX,
        top: 1403 * scaleY,
      }]}>
        <Svg 
          width={41 * scale} 
          height={37 * scale} 
          viewBox="0 0 41 37" 
          fill="none"
        >
          <G clipPath="url(#clip0_75_2248)">
            <Path 
              d="M18.8159 35.4322L19.0203 35.4944C19.7717 35.7218 20.4815 35.9362 20.9492 36.876C20.9611 36.8997 20.9777 36.9207 20.9981 36.9376C21.0185 36.9544 21.0422 36.9667 21.0676 36.9737C21.0836 36.9779 21.1 36.9802 21.1166 36.9802C21.1529 36.9802 21.1882 36.9695 21.2187 36.9496C21.5636 36.7228 21.8885 36.5174 22.1969 36.3223C22.8432 35.9132 23.4014 35.5603 23.9352 35.1491C25.8498 33.7063 27.5968 32.0501 29.1433 30.2115C31.1758 27.7539 33.2774 25.2125 35.2557 22.5522C36.4939 20.8868 37.5497 19.0276 38.4419 17.4163C39.3342 15.786 39.8655 13.9796 39.9991 12.1217C40.2412 9.06857 39.522 6.31658 37.8618 3.94232C36.0139 1.29984 33.5563 0.0129204 30.5627 0.112139C27.1855 0.226084 24.2154 1.52953 21.7346 3.98644C21.6143 4.11123 21.5029 4.24446 21.4014 4.38516C21.2085 4.63919 21.0254 4.88033 20.75 4.97587C17.8563 2.13 15.6438 1.01675 12.3341 0.731431C8.93742 0.438376 6.18756 1.54135 4.16053 4.00801C3.15455 5.22727 2.27284 6.54579 1.52877 7.94362C-0.057273 10.9421 -0.387768 14.1315 0.547998 17.4237C1.38255 20.3622 2.77409 23.109 4.64544 25.5118C8.38686 30.331 13.1546 33.6691 18.8159 35.4322ZM4.80495 8.51149C5.2396 7.68449 5.72382 6.88505 6.25483 6.11755C7.51729 4.25706 9.29657 3.31807 11.5529 3.31807C11.8325 3.31807 12.1193 3.33246 12.4134 3.36131C15.4273 3.65712 17.845 4.99777 19.5993 7.34589C19.81 7.6279 20.0395 7.88897 20.2419 8.11906C20.3243 8.21294 20.4018 8.30116 20.4701 8.38197C20.4986 8.41565 20.538 8.43808 20.5812 8.44542C21.3948 8.58716 21.7237 8.16118 21.9678 7.75216C23.3766 5.39281 25.5694 3.98447 28.8689 3.32031C29.6502 3.18415 30.4473 3.16395 31.2345 3.26045C32.4843 3.37955 33.5565 3.99977 34.4215 5.10333C35.4072 6.36917 35.9915 7.90599 36.0976 9.51269C36.2721 11.3698 35.9343 13.2396 35.1217 14.9149C34.5094 16.2134 33.8124 17.4695 33.0354 18.6747C31.5927 20.8209 30.0519 22.9546 28.5621 25.0179L28.0443 25.7358C26.9348 27.274 25.7874 28.8245 24.6781 30.3238C24.2777 30.8648 23.8778 31.406 23.478 31.9476C23.3055 32.1814 23.1259 32.4104 22.936 32.653C22.8733 32.7329 22.8097 32.8142 22.7449 32.8973C22.2128 32.6764 21.6947 32.4604 21.1866 32.2495C19.9874 31.7514 18.844 31.2763 17.7033 30.7942C14.546 29.4813 11.6861 27.5337 9.29747 25.07C6.8484 22.5257 5.15098 19.8037 4.10857 16.7483C3.15804 13.9614 3.38572 11.267 4.80495 8.51149Z" 
              fill="black"
            />
          </G>
          <Defs>
            <ClipPath id="clip0_75_2248">
              <Rect width="40.1069" height="37" fill="white"/>
            </ClipPath>
          </Defs>
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: '100%',
    backgroundColor: '#B5D750',
    position: 'relative',
    overflow: 'hidden',
  },
  carOutlineContainer: {
    position: 'absolute',
  },
  logoContainer: {
    position: 'absolute',
  },
  logoTextLine: {
    fontFamily: 'Trap-Bold',
    fontWeight: 'normal',
    textAlign: 'left',
  },
  logoTextDark: {
    color: '#263B33',
  },
  logoTextWhite: {
    color: 'white',
  },
  tagline: {
    position: 'absolute',
    color: '#263B33',
    fontFamily: 'NunitoSans_700Bold',
    fontWeight: '700',
  },
  footerText: {
    position: 'absolute',
    color: '#263B33',
    fontFamily: 'NunitoSans_700Bold',
    fontWeight: '700',
  },
  heartContainer: {
    position: 'absolute',
  },
});

export default SplashScreen;