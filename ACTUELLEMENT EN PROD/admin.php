<?php
// --- Connexion BDD ---
$pdo = new PDO("mysql:host=localhost;dbname=Domotique;charset=utf8", "FLASK", "iSi_2024", [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
]);

// ---------------------- //
// --- GESTION SITES --- //
// ---------------------- //
if (isset($_POST['add_site'])) {
    $stmt = $pdo->prepare("INSERT INTO site (Nom_Site, Adresse_Postale, CP, Ville) VALUES (?, ?, ?, ?)");
    $stmt->execute([$_POST['Nom_Site'], $_POST['Adresse_Postale'], $_POST['CP'], $_POST['Ville']]);
}

if (isset($_POST['edit_site'])) {
    $stmt = $pdo->prepare("UPDATE site SET Nom_Site=?, Adresse_Postale=?, CP=?, Ville=? WHERE id=?");
    $stmt->execute([$_POST['Nom_Site'], $_POST['Adresse_Postale'], $_POST['CP'], $_POST['Ville'], $_POST['id']]);
}

if (isset($_GET['delete_site'])) {
    $stmt = $pdo->prepare("DELETE FROM site WHERE id=?");
    $stmt->execute([$_GET['delete_site']]);
}

// ------------------------ //
// --- GESTION CAPTEURS --- //
// ------------------------ //
if (isset($_POST['add_capteur'])) {
    $stmt = $pdo->prepare("INSERT INTO Capteur_IoT (ID_Site, ID_EUI, Nom_Capteur, Seuil_Temperature, notif) VALUES (?, ?, ?, ?, ?)");
    $stmt->execute([$_POST['ID_Site'], $_POST['ID_EUI'], $_POST['Nom_Capteur'], $_POST['Seuil_Temperature'], isset($_POST['notif']) ? 1 : 0]);
}

if (isset($_GET['delete_capteur'])) {
    $stmt = $pdo->prepare("DELETE FROM Capteur_IoT WHERE id=?");
    $stmt->execute([$_GET['delete_capteur']]);
}

// ------------------------------ //
// --- GESTION DESTINATAIRES --- //
// ------------------------------ //
if (isset($_POST['add_destinataire'])) {
    $stmt = $pdo->prepare("INSERT INTO destinataire_email (ID_Site, Nom_Personne, Email, Phone_Number) VALUES (?, ?, ?, ?)");
    $stmt->execute([$_POST['ID_Site'], $_POST['Nom_Personne'], $_POST['Email'], $_POST['Phone_Number']]);
}

if (isset($_POST['edit_destinataire'])) {
    $stmt = $pdo->prepare("UPDATE destinataire_email SET Nom_Personne=?, Email=?, Phone_Number=? WHERE id=?");
    $stmt->execute([$_POST['Nom_Personne'], $_POST['Email'], $_POST['Phone_Number'], $_POST['id']]);
}

if (isset($_GET['delete_destinataire'])) {
    $stmt = $pdo->prepare("DELETE FROM destinataire_email WHERE id=?");
    $stmt->execute([$_GET['delete_destinataire']]);
}

// --- Récupération des données pour affichage ---
$sites = $pdo->query("SELECT * FROM site")->fetchAll(PDO::FETCH_ASSOC);
$capteurs = $pdo->query("SELECT c.*, s.Nom_Site FROM Capteur_IoT c LEFT JOIN site s ON c.ID_Site=s.id")->fetchAll(PDO::FETCH_ASSOC);
$destinataires = $pdo->query("SELECT d.*, s.Nom_Site FROM destinataire_email d LEFT JOIN site s ON d.ID_Site=s.id")->fetchAll(PDO::FETCH_ASSOC);
?>

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Administration Domotique</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
<div class="container mt-4">
    <h1 class="mb-4">Administration Domotique</h1>

    <!-- Onglets -->
    <ul class="nav nav-tabs" id="adminTabs" role="tablist">
        <li class="nav-item"><a class="nav-link active" data-bs-toggle="tab" href="#sites">Sites</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#capteurs">Capteurs</a></li>
        <li class="nav-item"><a class="nav-link" data-bs-toggle="tab" href="#destinataires">Destinataires</a></li>
    </ul>

    <div class="tab-content p-3 border bg-white">
        <!-- --- Onglet Sites --- -->
        <div class="tab-pane fade show active" id="sites">
            <h3>Gestion des sites</h3>
            <form method="post" class="row g-2 mb-3">
                <input type="hidden" name="id" value="">
                <div class="col-md-3"><input type="text" name="Nom_Site" class="form-control" placeholder="Nom du site" required></div>
                <div class="col-md-3"><input type="text" name="Adresse_Postale" class="form-control" placeholder="Adresse"></div>
                <div class="col-md-2"><input type="text" name="CP" class="form-control" placeholder="CP"></div>
                <div class="col-md-2"><input type="text" name="Ville" class="form-control" placeholder="Ville"></div>
                <div class="col-md-2"><button type="submit" name="add_site" class="btn btn-primary w-100">Ajouter</button></div>
            </form>
            <table class="table table-striped">
                <tr><th>ID</th><th>Nom</th><th>Adresse</th><th>CP</th><th>Ville</th><th>Actions</th></tr>
                <?php foreach($sites as $s): ?>
                    <tr>
                        <td><?= $s['id'] ?></td>
                        <td><?= htmlspecialchars($s['Nom_Site']) ?></td>
                        <td><?= htmlspecialchars($s['Adresse_Postale']) ?></td>
                        <td><?= htmlspecialchars($s['CP']) ?></td>
                        <td><?= htmlspecialchars($s['Ville']) ?></td>
                        <td>
                            <a href="?delete_site=<?= $s['id'] ?>" class="btn btn-danger btn-sm" onclick="return confirm('Supprimer ce site ?')">Supprimer</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </table>
        </div>

        <!-- --- Onglet Capteurs --- -->
        <div class="tab-pane fade" id="capteurs">
            <h3>Ajouter un capteur</h3>
            <form method="post" class="row g-2 mb-3">
                <div class="col-md-3">
                    <select name="ID_Site" class="form-control" required>
                        <option value="">-- Choisir un site --</option>
                        <?php foreach($sites as $s): ?>
                            <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['Nom_Site']) ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-2"><input type="text" name="ID_EUI" class="form-control" placeholder="ID EUI"></div>
                <div class="col-md-3"><input type="text" name="Nom_Capteur" class="form-control" placeholder="Nom capteur"></div>
                <div class="col-md-2"><input type="number" step="0.1" name="Seuil_Temperature" class="form-control" placeholder="Seuil Temp."></div>
                <div class="col-md-1"><input type="checkbox" name="notif" checked> Notif</div>
                <div class="col-md-1"><button type="submit" name="add_capteur" class="btn btn-primary w-100">Ajouter</button></div>
            </form>
            <table class="table table-striped">
                <tr><th>ID</th><th>Nom</th><th>Site</th><th>ID_EUI</th><th>Seuil Temp.</th><th>Notif</th><th>Actions</th></tr>
                <?php foreach($capteurs as $c): ?>
                    <tr>
                        <td><?= $c['id'] ?></td>
                        <td><?= htmlspecialchars($c['Nom_Capteur']) ?></td>
                        <td><?= htmlspecialchars($c['Nom_Site']) ?></td>
                        <td><?= htmlspecialchars($c['ID_EUI']) ?></td>
                        <td><?= $c['Seuil_Temperature'] ?></td>
                        <td><?= $c['notif'] ? 'Oui' : 'Non' ?></td>
                        <td>
                            <a href="?delete_capteur=<?= $c['id'] ?>" class="btn btn-danger btn-sm" onclick="return confirm('Supprimer ce capteur ?')">Supprimer</a>
                        </td>
                    </tr>
                <?php endforeach; ?>
            </table>
        </div>
	<!-- --- Onglet Destinataires --- -->
	<div class="tab-pane fade" id="destinataires">
	    <h3>Gestion des destinataires</h3>
	    <form method="post" class="row g-2 mb-3">
		<div class="col-md-3">
		    <select name="ID_Site" class="form-control" required>
		        <option value="">-- Choisir un site --</option>
		        <?php foreach($sites as $s): ?>
		            <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['Nom_Site']) ?></option>
		        <?php endforeach; ?>
		    </select>
		</div>
		<div class="col-md-2"><input type="text" name="Nom_Personne" class="form-control" placeholder="Nom"></div>
		<div class="col-md-2"><input type="email" name="Email" class="form-control" placeholder="Email 1"></div>
		<div class="col-md-2"><input type="email" name="Email2" class="form-control" placeholder="Email 2"></div>
		<div class="col-md-2"><input type="email" name="Email3" class="form-control" placeholder="Email 3"></div>
		<div class="col-md-2"><input type="text" name="Phone_Number" class="form-control" placeholder="Téléphone 1"></div>
		<div class="col-md-2"><input type="text" name="Phone_Number2" class="form-control" placeholder="Téléphone 2"></div>
		<div class="col-md-2"><input type="text" name="Phone_Number3" class="form-control" placeholder="Téléphone 3"></div>
		<div class="col-md-2"><button type="submit" name="add_destinataire" class="btn btn-primary w-100">Ajouter</button></div>
	    </form>
	    <table class="table table-striped">
		<tr>
		    <th>ID</th><th>Nom</th>
		    <th>Email 1</th><th>Email 2</th><th>Email 3</th>
		    <th>Tél 1</th><th>Tél 2</th><th>Tél 3</th>
		    <th>Site</th><th>Actions</th>
		</tr>
		<?php foreach($destinataires as $d): ?>
		    <tr>
		        <td><?= $d['id'] ?></td>
		        <td><?= htmlspecialchars($d['Nom_Personne']) ?></td>
		        <td><?= htmlspecialchars($d['Email']) ?></td>
		        <td><?= htmlspecialchars($d['Email2']) ?></td>
		        <td><?= htmlspecialchars($d['Email3']) ?></td>
		        <td><?= htmlspecialchars($d['Phone_Number']) ?></td>
		        <td><?= htmlspecialchars($d['Phone_Number2']) ?></td>
		        <td><?= htmlspecialchars($d['Phone_Number3']) ?></td>
		        <td><?= htmlspecialchars($d['Nom_Site']) ?></td>
		        <td>
		            <a href="?delete_destinataire=<?= $d['id'] ?>" 
		               class="btn btn-danger btn-sm" 
		               onclick="return confirm('Supprimer ce destinataire ?')">Supprimer</a>
		        </td>
		    </tr>
		<?php endforeach; ?>
	    </table>
	</div>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>

