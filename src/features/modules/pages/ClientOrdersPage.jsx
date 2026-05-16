import { useState, useEffect, useContext } from "react";
import { ClientContext } from "../../../contexts/ClientContext";
import {
  listOrdersService,
  getOrderStateLabel,
} from "../services/order.service";
import { ensureCustomerSecureKey } from "../services/prestashopCache";

function normaliseField(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    return value["#text"] ?? value["@_id"] ?? JSON.stringify(value);
  }
  return value;
}

function ClientOrdersPage() {
  const { currentClient } = useContext(ClientContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClientOrders = async () => {
      if (!currentClient || currentClient.isAnonymous) {
        setLoading(false);
        setOrders([]);
        return;
      }

      try {
        // 1. Obtenir l'ID correct du serveur (sécurise contre les IDs locaux obsolètes)
        const email = currentClient.email || "";
        const { id: realCustomerId } = await ensureCustomerSecureKey(
          email,
          currentClient.id,
        );

        // 2. On récupère toutes les commandes (non filtrées par état)
        const allOrders = await listOrdersService();

        // 3. On filtre pour ne garder que celles du client actuel
        const clientOrders = allOrders.filter((order) => {
          const orderClientId = normaliseField(order.id_customer);
          return String(orderClientId) === String(realCustomerId);
        });

        setOrders(clientOrders);
      } catch (err) {
        console.error("Erreur chargement commandes client:", err);
        setError("Impossible de charger vos commandes.");
      } finally {
        setLoading(false);
      }
    };

    loadClientOrders();
  }, [currentClient]);

  if (!currentClient || currentClient.isAnonymous) {
    return (
      <div style={{ padding: "20px" }}>
        <h2>Mes Commandes</h2>
        <p>
          {currentClient?.isAnonymous
            ? "Les utilisateurs anonymes n'ont pas d'historique de commande."
            : "Veuillez vous connecter pour voir vos commandes."}
        </p>
      </div>
    );
  }

  if (loading)
    return (
      <div style={{ padding: "20px" }}>Chargement de vos commandes...</div>
    );

  return (
    <div style={{ padding: "20px" }}>
      <h2>Mes Commandes</h2>
      <p>Voici l'historique et l'état de vos commandes.</p>

      {error && (
        <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>
      )}

      {orders.length === 0 ? (
        <div
          style={{
            padding: "20px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            backgroundColor: "#f9f9f9",
          }}
        >
          Vous n'avez pas encore passé de commande.
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr style={{ backgroundColor: "#f2f2f2" }}>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Réf. Commande
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "left",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Date
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "right",
                  borderBottom: "2px solid #ddd",
                }}
              >
                Montant
              </th>
              <th
                style={{
                  padding: "12px",
                  textAlign: "center",
                  borderBottom: "2px solid #ddd",
                }}
              >
                État
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const id = normaliseField(order.id);
              const date = normaliseField(order.date_add);
              const totalRaw = normaliseField(order.total_paid);
              const total = parseFloat(totalRaw) || 0;
              const stateId = normaliseField(order.current_state);
              const stateLabel = getOrderStateLabel(stateId);

              return (
                <tr key={id}>
                  <td
                    style={{ padding: "12px", borderBottom: "1px solid #eee" }}
                  >
                    #{id}
                  </td>
                  <td
                    style={{ padding: "12px", borderBottom: "1px solid #eee" }}
                  >
                    {date}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "right",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    {total.toLocaleString("fr-FR", {
                      style: "currency",
                      currency: "EUR",
                    })}
                  </td>
                  <td
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      borderBottom: "1px solid #eee",
                    }}
                  >
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "600",
                        backgroundColor:
                          stateId === "6"
                            ? "#f8d7da"
                            : stateId === "2"
                              ? "#d4edda"
                              : "#fff3cd",
                        color:
                          stateId === "6"
                            ? "#721c24"
                            : stateId === "2"
                              ? "#155724"
                              : "#856404",
                        border: `1px solid ${stateId === "6" ? "#f5c6cb" : stateId === "2" ? "#c3e6cb" : "#ffeeba"}`,
                      }}
                    >
                      {stateLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ClientOrdersPage;
