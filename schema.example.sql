-- La base confessions_db existe deja dans phpMyAdmin.
-- Ne pas executer ce fichier : il sert uniquement de rappel de la structure utilisee par l'API.
-- Tables attendues : categories, users, coach_profiles, confessions.
--
-- Relations :
-- confessions.user_id -> users.id
-- confessions.category_id -> categories.id
-- confessions.coach_id -> coach_profiles.id
-- coach_profiles.user_id -> users.id

SHOW TABLES;
