// Configuration globale pour les tests Jest
import '@testing-library/jest-dom';

// Définition globale des types Jest
declare global {
  namespace NodeJS {
    interface Global {
      expect: typeof import('@jest/globals').expect;
      test: typeof import('@jest/globals').test;
      describe: typeof import('@jest/globals').describe;
      beforeEach: typeof import('@jest/globals').beforeEach;
      afterEach: typeof import('@jest/globals').afterEach;
      beforeAll: typeof import('@jest/globals').beforeAll;
      afterAll: typeof import('@jest/globals').afterAll;
      jest: typeof import('@jest/globals').jest;
    }
  }
}

// Si nécessaire, configuration supplémentaire peut être ajoutée ici
