import {
  fetchModuleIds,
  fetchModuleRecord,
  updateResource,
  createResource,
} from "../../../api/prestashop.api";

export async function listClientsService() {
  const clientIds = await fetchModuleIds("customers");
  const clients = await Promise.all(
    clientIds.map((id) => fetchModuleRecord("customers", id))
  );
  return clients.filter(Boolean);
}

