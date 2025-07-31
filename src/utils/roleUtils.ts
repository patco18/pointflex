import { canCreateUserWithRole, canManageRole, UserRole, ROLES } from "../types/roles";

/**
 * Utilitaire pour tester la logique des rôles et permissions
 */
export function testRoleLogic() {
  console.log("=== TESTS DE LOGIQUE DES RÔLES ===");
  
  // Test 1: Vérification de la gestion des rôles
  console.log("\n-- Test 1: Un rôle peut-il gérer un autre rôle? --");
  const allRoles: UserRole[] = Object.keys(ROLES) as UserRole[];
  
  allRoles.forEach(managerRole => {
    console.log(`\nRôle gestionnaire: ${managerRole} (niveau ${ROLES[managerRole].level})`);
    
    allRoles.forEach(targetRole => {
      const canManage = canManageRole(managerRole, targetRole);
      console.log(`- Peut gérer ${targetRole} (niveau ${ROLES[targetRole].level}): ${canManage ? '✅ OUI' : '❌ NON'}`);
    });
  });
  
  // Test 2: Vérification de la création d'utilisateurs avec rôles
  console.log("\n-- Test 2: Un rôle peut-il créer un utilisateur avec un autre rôle? --");
  
  allRoles.forEach(creatorRole => {
    console.log(`\nRôle créateur: ${creatorRole} (niveau ${ROLES[creatorRole].level})`);
    
    allRoles.forEach(targetRole => {
      // Même entreprise
      const canCreateSameCompany = canCreateUserWithRole(creatorRole, targetRole, true);
      console.log(`- Peut créer ${targetRole} (même entreprise): ${canCreateSameCompany ? '✅ OUI' : '❌ NON'}`);
      
      // Entreprise différente
      const canCreateDiffCompany = canCreateUserWithRole(creatorRole, targetRole, false);
      console.log(`- Peut créer ${targetRole} (autre entreprise): ${canCreateDiffCompany ? '✅ OUI' : '❌ NON'}`);
    });
  });

  console.log("\n=== FIN DES TESTS ===");
}
