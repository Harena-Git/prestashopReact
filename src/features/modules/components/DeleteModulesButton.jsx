function DeleteModulesButton({ loading, selectedCount, onDelete }) {
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={onDelete} disabled={selectedCount === 0 || loading}>
        {loading
          ? "Suppression en cours..."
          : `Supprimer le module selectionne (${selectedCount})`}
      </button>
    </div>
  );
}

export default DeleteModulesButton;
