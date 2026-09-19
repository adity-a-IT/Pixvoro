import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

import { HomeScreen } from '../screens/HomeScreen';
import { ImageOrganizerScreen } from '../screens/ImageOrganizerScreen';
import { PdfSettingsScreen } from '../screens/PdfSettingsScreen';
import { PdfResultScreen } from '../screens/PdfResultScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { PdfViewerScreen } from '../screens/PdfViewerScreen';
import { PdfEditorScreen } from '../screens/PdfEditorScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ImageOrganizer" component={ImageOrganizerScreen} />
      <Stack.Screen name="PdfSettings" component={PdfSettingsScreen} />
      <Stack.Screen name="PdfResult" component={PdfResultScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="PdfViewer" component={PdfViewerScreen} />
      <Stack.Screen name="PdfEditor" component={PdfEditorScreen} />
    </Stack.Navigator>
  );
};

