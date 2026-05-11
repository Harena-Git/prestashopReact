-- ============================================================
-- SUPPRESSION DES DONNÉES INSÉRÉES PAR L'IMPORT CSV
-- Basé sur les IDs retournés dans les logs d'import
-- ============================================================

-- ÉTAPE 1 : Supprimer les combinaisons (Fichier 2 — IDs 40 à 43)
-- ---------------------------------------------------------------
DELETE FROM ps_product_attribute_combination  WHERE id_product_attribute IN (40, 41, 42, 43);
DELETE FROM ps_product_attribute_shop         WHERE id_product_attribute IN (40, 41, 42, 43);
DELETE FROM ps_stock_available                WHERE id_product_attribute IN (40, 41, 42, 43);
DELETE FROM ps_product_attribute              WHERE id_product_attribute IN (40, 41, 42, 43);

-- ÉTAPE 2 : Supprimer les produits (Fichier 1 — IDs 20 à 23)
-- -----------------------------------------------------------
DELETE FROM ps_category_product  WHERE id_product IN (20, 21, 22, 23);
DELETE FROM ps_stock_available   WHERE id_product IN (20, 21, 22, 23) AND id_product_attribute = 0;
DELETE FROM ps_product_shop      WHERE id_product IN (20, 21, 22, 23);
DELETE FROM ps_product_lang      WHERE id_product IN (20, 21, 22, 23);
DELETE FROM ps_product           WHERE id_product IN (20, 21, 22, 23);

-- ÉTAPE 3 : Supprimer adresses et paniers des clients créés (IDs 3, 4)
-- ---------------------------------------------------------------------
DELETE FROM ps_cart_product  WHERE id_cart IN (SELECT id_cart FROM ps_cart WHERE id_customer IN (3, 4));
DELETE FROM ps_cart          WHERE id_customer IN (3, 4);
DELETE FROM ps_address       WHERE id_customer IN (3, 4);

-- ÉTAPE 4 : Supprimer les clients (Fichier 3 — IDs 3, 4)
-- -------------------------------------------------------
DELETE FROM ps_customer WHERE id_customer IN (3, 4);
