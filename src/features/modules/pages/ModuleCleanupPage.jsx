import { useMemo, useState } from "react";
import ModuleSelectionList from "../components/ModuleSelectionList";
import DeleteModulesButton from "../components/DeleteModulesButton";
import { MODULE_REGISTRY } from "../constants/moduleRegistry";
import { deleteSelectedModules } from "../services/moduleDeletion.service";
import { areAllModulesSelected, toggleModuleSelection } from "../utils/selection";

function ModuleCleanupPage() {
  // sauvena anaty usememo le valeur an'ilay modules
  const modules = useMemo(() => Object.keys(MODULE_REGISTRY), []);
  // mi-gerer an'ilay fonction de selection
  const [selectedModules, setSelectedModules] = useState([]);

  // etat pour gerer les chargement
  const [loading, setLoading] = useState(false);

  // verification raha selectionner daholo (dia cochena daholo)
  const allSelected = areAllModulesSelected(selectedModules, modules);

  // mise a jours de state : Toggle d'un module
  const onToggleModule = (moduleName) => {
    setSelectedModules((currentSelection) =>
      toggleModuleSelection(currentSelection, moduleName),
    );
  };

  // tout selectionner (checkbox)
  const onToggleAll = () => {
    setSelectedModules(allSelected ? [] : [...modules]);
  };

  // fonction principale de suppression de donnee de module
  const onDeleteSelected = async () => {
    const shouldDelete = window.confirm(
      `Voulez-vous vraiment supprimer les donnees de ${selectedModules.length} modules ?`,
    );

    if (!shouldDelete) return;

    // bloquer le bouton
    setLoading(true);

    try {
      const results = await deleteSelectedModules(selectedModules);
      console.log("Suppression terminee :", results);

      const failed = results.filter((result) => !result.success);
      const deletedRecords = results.reduce(
        (sum, result) => sum + (result.deleted || 0),
        0,
      );
      if (failed.length === 0) {
        alert(
          `Suppression reussie ! ${deletedRecords} enregistrement(s) supprime(s) sur ${results.length} module(s).`,
        );
        setSelectedModules([]);
      } else if (failed.length === results.length) {
        // Tous les modules ont echoue
        alert(
          `Erreur : Aucun module n'a pu etre supprime.\n\nEchecs:\n${failed
            .map((item) => `${item.module}: ${item.error}`)
            .join("\n")}`,
        );
      } else {
        // Certains modules ont ete supprimes, d'autres non
        alert(
          `Suppression partielle : ${deletedRecords} enregistrement(s) supprime(s), ${failed.length} module(s) en echec.\n\nEchecs:\n${failed
            .map((item) => `${item.module}: ${item.error}`)
            .join("\n")}`,
        );
        setSelectedModules(failed.map((item) => item.module)); // Garder les modules echoues selectionnes
      }
    } catch (error) {
      console.error("Erreur lors de la suppression :", error);
      alert("Une erreur est survenue lors de la suppression.");
    } finally {
      setLoading(false); // Debloque le bouton
    }
  };

  return (
    <main style={{ padding: 16 }}>
      <h1>Suppression des donnees des modules</h1>

      <ModuleSelectionList
        modules={modules}
        selectedModules={selectedModules}
        loading={loading}
        allSelected={allSelected}
        onToggleAll={onToggleAll}
        onToggleModule={onToggleModule}
      />

      <DeleteModulesButton
        loading={loading}
        selectedCount={selectedModules.length}
        onDelete={onDeleteSelected}
      />
    </main>
  );
}

export default ModuleCleanupPage;
