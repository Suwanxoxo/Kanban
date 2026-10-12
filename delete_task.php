<?php
header('Content-Type: application/json');

$servername = "localhost";
$username = "admin";
$password = "DEIN_PASSWORT";
$dbname = "kanban";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(["error" => "Verbindung fehlgeschlagen"]));
}

$data = json_decode(file_get_contents("php://input"));

if(isset($data->id)) {
    $id = $conn->real_escape_string($data->id);

    // SQL Befehl zum Löschen
    $sql = "DELETE FROM tasks WHERE id='$id'";

    if ($conn->query($sql) === TRUE) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
} else {
    echo json_encode(["error" => "Keine ID übermittelt"]);
}

$conn->close();
?>