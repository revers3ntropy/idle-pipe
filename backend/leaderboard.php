<?php
include $_SERVER['DOCUMENT_ROOT'].'/util.php';

$allItems = query("SELECT userData.idlePipeHighScore as score, Username, users.adminLVL
                  FROM users, userData
                  WHERE users.ID=userData.id AND userData.idlePipeHighscore > 0
                  ORDER BY CAST(userData.idlePipeHighScore AS unsigned) desc", 0);


$users = Array();

while ($row = mysqli_fetch_assoc($allItems)){
    array_push($users, $row);
}

echo json_encode($users);
