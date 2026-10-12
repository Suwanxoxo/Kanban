<?php
// Sagt dem Browser, dass wir JSON-Daten zurückschicken
header('Content-Type: application/json');

// Datenbank-Verbindung (XAMPP Standard)
$servername = "localhost";
$username = "admin";
$password = "DEIN_PASSWORT";
$dbname = "kanban";

$conn = new mysqli($servername, $username, $password, $dbname);

// Prüfen, ob die Verbindung geklappt hat
if ($conn->connect_error) {
    die(json_encode(["error" => "Verbindung fehlgeschlagen: " . $conn->connect_error]));
}

// Daten empfangen, die wir mit JavaScript geschickt haben
$data = json_decode(file_get_contents("php://input"));

// Wenn Text und Status da sind, speichern wir sie
if(isset($data->text) && isset($data->status)) {
    
    // Eingaben absichern
    $name = $conn->real_escape_string($data->text);
    $status = $conn->real_escape_string($data->status);
    $date = isset($data->date) ? $conn->real_escape_string($data->date) : '';

    // SQL Befehl zusammenbauen (angepasst an deine Spaltennamen!)
    if (empty($date)) {
        // Wenn du im Kalender kein Datum gewählt hast, nutzen wir den automatischen Timestamp der DB
        $sql = "INSERT INTO tasks (name, status) VALUES ('$name', '$status')";
    } else {
        // Wenn du ein Datum gewählt hast, tragen wir es ein
        $sql = "INSERT INTO tasks (name, status, date) VALUES ('$name', '$status', '$date')";
    }

    // Abfeuern!
    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        echo json_encode(["error" => "Fehler beim Speichern: " . $conn->error]);
    }
} else {
    echo json_encode(["error" => "Fehlende Daten vom Frontend"]);
}

$conn->close();
?>