const path = require('path');
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const { DefinePlugin } = require('webpack');
const dotenv = require('dotenv');

module.exports = async function (env, argv) {
  // Charger les variables d'environnement depuis le fichier .env
  const dotenvResult = dotenv.config();
  if (dotenvResult.error) {
    throw dotenvResult.error;
  }

  // Créer la configuration de base avec Expo
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: [
        '@react-native-async-storage/async-storage',
        'react-native-maps',
      ],
    },
  }, argv);

  // Définir les alias pour faciliter l'importation
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    '@env': path.resolve(__dirname, '.env'),
  };

  // Ajouter les variables d'environnement pour l'application web
  const env_variables = {
    'process.env.API_BASE_URL': JSON.stringify(process.env.API_BASE_URL || 'http://localhost:5000/api'),
  };

  // Ajouter le plugin DefinePlugin pour les variables d'environnement
  config.plugins.push(new DefinePlugin(env_variables));

  // Configurer l'entrée et la sortie
  config.entry = {
    app: path.resolve(__dirname, 'index.web.js'),
  };
  
  config.output = {
    ...config.output,
    path: path.resolve(__dirname, 'web-build'),
    filename: 'bundle.[contenthash].js',
  };

  return config;
};
