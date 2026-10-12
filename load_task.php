<?php
header('Content-Type: application/json');

$servername = "localhost";
$username = "admin";
$password = "DEIN_PASSWORT";
$dbname = "kanban";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["error" => "Verbindung fehlgeschlagen: " . $conn->connect_error]));
}

// Hol alle Aufgaben aus der Tabelle
$sql = "SELECT id, name, status, date FROM tasks";
$result = $conn->query($sql);

$tasks = [];

// Wenn es Ergebnisse gibt, packe sie in unser Array
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $tasks[] = $row;
    }
}

// Schicke das Array als JSON an JavaScript
echo json_encode($tasks);

$conn->close();
?>