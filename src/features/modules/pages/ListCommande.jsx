import { useState, useEffect } from "react";
import {
  listOrdersService,
  updateOrderStatusService,
  getOrderStateLabel,
  PAYMENT_DONE_STATE_ID,
  ORDER_CANCELED_STATE_ID,
} from "../services/order.service";

function normaliseField(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return value["#text"] ?? value["@_id"] ?? JSON.stringify(value);
  }
  return value;
}

function ListCommande() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await listOrdersService();
        setOrders(data);
      } catch (error) {
        console.error("Erreur de chargement des commandes", error);
        setMessage("Erreur lors du chargement des commandes.");
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  const handleChangeStatus = async (orderId, newStateId, label) => {
    setMessage("");
    setUpdatingOrderId(orderId);

    try {
      await updateOrderStatusService(orderId, newStateId);
      setOrders((prev) =>
        prev.map((order) =>
          String(normaliseField(order.id)) === String(orderId)
            ? { ...order, current_state: String(newStateId) }
            : order,
        ),
      );
      setMessage(`Statut de la commande ${orderId} mis à jour en '${label}'.`);
      setMessageType("success");
    } catch (error) {
      console.error("Erreur mise à jour statut commande", error);
      setMessage(`Erreur lors de la mise à jour : ${error.message}`);
      setMessageType("error");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (loading) {
    return <div>Chargement des commandes...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Liste des commandes</h1>
      <p>Modifiez l'état d'une commande en mode paiement effectué ou annulé.</p>

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "10px 15px",
            borderRadius: "6px",
            backgroundColor: messageType === "success" ? "#d4edda" : "#f8d7da",
            color: messageType === "success" ? "#155724" : "#721c24",
            border: `1px solid ${messageType === "success" ? "#c3e6cb" : "#f5c6cb"}`,
          }}
        >
          {message}
        </div>
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ccc", padding: "10px" }}>
              ID
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "10px" }}>
              Client
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "10px" }}>
              Montant
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "10px" }}>
              Statut
            </th>
            <th style={{ borderBottom: "1px solid #ccc", padding: "10px" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", padding: "20px" }}>
                Aucune commande trouvée pour les états autorisés (Paiement
                effectué, Annulé, Dans le panier).
              </td>
            </tr>
          ) : (
            orders.map((order) => {
              const orderId = normaliseField(order.id);
              const currentState = normaliseField(order.current_state);
              const customerId = normaliseField(order.id_customer);
              const amount = normaliseField(order.total_paid);
              const stateLabel = getOrderStateLabel(currentState);
              const isUpdating = updatingOrderId === orderId;

              return (
                <tr key={orderId}>
                  <td
                    style={{
                      borderBottom: "1px solid #eaeaea",
                      padding: "10px",
                    }}
                  >
                    {orderId}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eaeaea",
                      padding: "10px",
                    }}
                  >
                    {customerId}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eaeaea",
                      padding: "10px",
                    }}
                  >
                    {amount}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eaeaea",
                      padding: "10px",
                    }}
                  >
                    {stateLabel}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eaeaea",
                      padding: "10px",
                    }}
                  >
                    <button
                      onClick={() =>
                        handleChangeStatus(
                          orderId,
                          PAYMENT_DONE_STATE_ID,
                          "Paiement effectué",
                        )
                      }
                      disabled={
                        isUpdating ||
                        String(currentState) === String(PAYMENT_DONE_STATE_ID)
                      }
                      style={{
                        marginRight: "8px",
                        padding: "8px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isUpdating ? "not-allowed" : "pointer",
                      }}
                    >
                      Paiement effectué
                    </button>

                    <button
                      onClick={() => alert("A implementer")}
                      disabled={isUpdating}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#dc3545",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: isUpdating ? "not-allowed" : "pointer",
                      }}
                    >
                      Annuler
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default ListCommande;
