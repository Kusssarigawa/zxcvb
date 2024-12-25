(function ($, Backendless) {
  var APPLICATION_ID = 'C3F3200F-1694-4840-9693-013469C3FEFB';
  var SECRET_KEY = 'AE098DB6-DA7F-492C-9B4D-5B83CA899F3C';
  var currentUser = null;

  if (!APPLICATION_ID || !SECRET_KEY)
    alert("Missing application ID or secret key arguments. Login to Backendless Console, select your app and get the ID and key from the Manage > App Settings screen. Copy/paste the values into the Backendless.initApp call.");

  init();

  function init() {
    $('.carousel').carousel({interval: false});
    Backendless.initApp(APPLICATION_ID, SECRET_KEY);
    initEventHandlers();
    initProfilePhotoHandlers();
  }

    function initEventHandlers() {
        $('#register-btn').on('click', createUser);
        $('#login-btn').on('click', loginUser);
        $('#forgot-password-btn').on('click', resetPassword);
        $('#create-folder-btn').on('click', createFolder);
        $('#delete-item-btn').on('click', deleteItem);
        $('#list-files-btn').on('click', listFiles);
        $('#upload-file-btn').on('click', uploadFile);
        $('#download-file-btn').on('click', downloadFile);
        $('#share-file-btn').on('click', shareFile);
        $('#list-shared-files-btn').on('click', listSharedFiles);
        $('#take-photo-btn').on('click', takeAndUploadPhoto);
        $('#update-profile-btn').on('click', updateProfile);
        $('#toggle-location-tracking-btn').on('click', toggleLocationTracking);
        $('#add-place-btn').on('click', addPlace);
        $('#delete-place-btn').on('click', deletePlace);
        $('#search-places-btn').on('click', searchPlaces);
        $('#like-place-btn').on('click', likePlace);
        $('#view-place-on-map-btn').on('click', viewPlaceOnMap);
        $('#go-to-file-management-btn').on('click', navigateToFileManagement);
        $('#go-to-profile-btn').on('click', navigateToProfile);
        $('#go-to-places-btn').on('click', navigateToPlaces);
        $('#update-profile-photo-btn').on('click', updateProfilePhoto);
        $('#save-avatar-btn').on('click', saveSelectedAvatar);
        $('#send-feedback-btn').on('click', sendFeedback);
        // Новые обработчики для раздела "Друзі"
        $('#add-friend-btn').on('click', addFriend);
        $('#fetch-friend-requests-btn').on('click', () => {
            Backendless.Data.of("FriendRequests")
                .find({ where: `recipientId = '${currentUser.objectId}' AND status = 'pending'` })
                .then(requests => {
                    const requestsHtml = requests.map(request => {
                        const container = $('<div></div>');
                        const text = $(`<p><strong>${request.senderEmail}</strong> хочет стать вашим другом.</p>`);
                        const acceptButton = $('<button class="btn btn-success">Прийняти</button>');
                        const rejectButton = $('<button class="btn btn-danger">Відхилити</button>');

                        acceptButton.on('click', () => handleFriendRequest(request.objectId, 'accept'));
                        rejectButton.on('click', () => handleFriendRequest(request.objectId, 'reject'));

                        container.append(text, acceptButton, rejectButton);
                        return container;
                    });

                    $('#friend-requests').html(requestsHtml || "<p>Немає запитів.</p>");
                })
                .catch(error => console.error("Error fetching friend requests:", error));
        });
        $('#delete-friend-btn').on('click', deleteFriend);
        $('#list-friends-btn').on('click', listFriends);
        $('#find-friends-btn').on('click', () => {
            const radius = parseFloat($('#friend-search-radius').val());
            if (!radius || radius <= 0) {
                showInfo("Please enter a valid radius.");
                return;
            }
            findFriends(radius);
        });
    }

    function addFriend() {
        const friendEmail = $('#friend-email').val();
        if (!friendEmail) {
            showInfo("Please enter the email of the friend.");
            return;
        }

        if (!currentUser) {
            showInfo("Please login first.");
            return;
        }

        Backendless.Data.of("Users")
            .findFirst({ where: `email = '${friendEmail}'` })
            .then(friend => {
                if (!friend) {
                    showInfo("User not found.");
                    return Promise.reject("User not found.");
                }

                const friendRequest = {
                    senderId: currentUser.objectId,  // Используем objectId текущего пользователя
                    senderEmail: currentUser.email,
                    recipientID: friend.objectId,   // Используем objectId друга
                    recipientEmail: friend.email,
                    status: "pending"
                };

                return Backendless.Data.of("FriendRequests").save(friendRequest);
            })
            .then(() => showInfo("Friend request sent successfully."))
            .catch(error => console.error("Error sending friend request:", error));
    }



    function handleFriendRequest(requestId, action) {
        if (!currentUser) {
            showInfo("Please login first.");
            return;
        }

        Backendless.Data.of("FriendRequests")
            .findById(requestId)
            .then(request => {
                console.log("Request found:", request);
                console.log("Current user ID:", currentUser.objectId);

                // Исправляем поле на правильное имя
                if (!request || request.recipientID !== currentUser.objectId) {
                    console.error("Invalid request. Request data:", request);
                    showInfo("Invalid request.");
                    return Promise.reject("Invalid request.");
                }

                if (action === "accept") {
                    // Проверяем, существует ли отправитель
                    return Backendless.Data.of("Users").findById(request.senderId)
                        .then(sender => {
                            if (!sender) {
                                console.error("Sender not found:", request.senderId);
                                showInfo("Sender not found.");
                                return Promise.reject("Sender not found.");
                            }

                            // Добавляем связь в таблице Users
                            return Backendless.Data.of("Users").addRelation(currentUser.objectId, "friends", [request.senderId])
                                .then(() => Backendless.Data.of("Users").addRelation(request.senderId, "friends", [currentUser.objectId]))
                                .then(() => Backendless.Data.of("FriendRequests").remove(request));
                        });
                } else if (action === "reject") {
                    return Backendless.Data.of("FriendRequests").remove(request);
                } else {
                    return Promise.reject("Invalid action.");
                }
            })
            .then(() => showInfo(`Friend request ${action}ed successfully.`))
            .catch(error => console.error("Error handling friend request:", error));
    }




    function deleteFriend() {
        const friendEmail = $('#friend-email').val();
        if (!friendEmail || !currentUser) {
            showInfo("Please enter the email of the friend.");
            return;
        }

        Backendless.Data.of("Users")
            .findFirst({ where: `email = '${friendEmail}'` })
            .then(friend => {
                if (!friend) {
                    showInfo("Friend not found.");
                    return Promise.reject("Friend not found.");
                }

                return Backendless.Data.of("Users")
                    .deleteRelation(currentUser.objectId, "friends", [friend.objectId])
                    .then(() => Backendless.Data.of("Users").deleteRelation(friend.objectId, "friends", [currentUser.objectId]));
            })
            .then(() => showInfo("Friend deleted successfully."))
            .catch(error => console.error("Error deleting friend:", error));
    }
    function listFriends() {
        if (!currentUser) {
            showInfo("Please login first.");
            return;
        }

        const relationName = "friends";  // Убедитесь, что это правильное имя

        console.log("Loading relations for user:", currentUser.objectId);
        console.log("Using relation name:", relationName);
        console.log("Current User ID:", currentUser.objectId);
        Backendless.Data.of("Users").loadRelations(currentUser.objectId, "friends")
            .then(friends => {
                console.log("Friends found:", friends);
                if (friends.length === 0) {
                    $('#friends-list').html("<p>You have no friends yet.</p>");
                    return;
                }

                const friendsHtml = friends.map(friend => `
                <div>
                    <p><strong>${friend.name}</strong> (${friend.email})</p>
                </div>
            `).join('');

                $('#friends-list').html(friendsHtml);
            })
            .catch(error => {
                console.error("Error fetching friends list:", error);
                showInfo("Error fetching friends list.");
            });
    }


    function findFriends(radius) {
        if (!currentUser) {
            showInfo("Please login first.");
            return;
        }

        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;

            const geoFilter = {
                "my location": {
                    "$nearSphere": {
                        "$geometry": { "type": "Point", "coordinates": [longitude, latitude] },
                        "$maxDistance": radius * 1000
                    }
                }
            };

            Backendless.Data.of("Users").find({ where: `trackLocation = true`, geoFilter })
                .then(friends => {
                    const friendsHtml = friends.map(friend => `
                <div>
                    <p><strong>${friend.name}</strong> (${friend.email})</p>
                </div>
            `).join('');

                    $('#friends-search-results').html(friendsHtml || "<p>No friends found in this radius.</p>");
                })
                .catch(error => console.error("Error finding friends:", error));
        });
    }



    function sendFeedback() {
        const message = $('#feedback-message').val();
        const type = $('#feedback-type').val();

        if (!message || !type) {
            showInfo("Please enter a message and select a type.");
            return;
        }

        const emailSubject = `Feedback: ${type}`;
        const recipient = "arsenahaev052@gmail.com";

        const bodyParts = {
            textmessage: `Feedback Type: ${type}\nMessage: ${message}`,
            htmlmessage: `
            <p>You have received new feedback:</p>
            <p><strong>Type:</strong> ${type}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
        `
        };

        Backendless.Messaging.sendEmail(emailSubject, bodyParts, [recipient])
            .then(() => showInfo("Feedback sent successfully."))
            .catch(error => {
                console.error("Error sending feedback:", error);
                showInfo("Error sending feedback: " + error.message);
            });
    }

  function initProfilePhotoHandlers() {
    // Обработчик для кнопки загрузки нового фото
    $('#update-profile-photo-btn').on('click', function() {
      $('#profile-photo-input').click();
    });

    // Обработчик изменения файла
    $('#profile-photo-input').on('change', handleProfilePhotoUpload);

    // Обработчик для выбора существующего фото
    $('#choose-existing-photo-btn').on('click', showExistingPhotos);

    // Обработчик сохранения выбранного фото
    $('#save-avatar-btn').on('click', saveSelectedPhoto);
  }
  function saveSelectedPhoto() {
        const selectedPhotoUrl = $('input[name="selected_photo"]:checked').val();

        if (!selectedPhotoUrl) {
            showInfo("Please select a photo.");
            return;
        }

        Backendless.UserService.update({
            objectId: currentUser.objectId,
            profilePhoto: selectedPhotoUrl
        })
            .then(updatedUser => {
                currentUser = updatedUser;
                $('#profile-avatar').attr('src', currentUser.profilePhoto); // Обновляем аватар в интерфейсе
                $('#avatar-selection-modal').modal('hide');
                showInfo("Profile photo updated successfully.");
            })
            .catch(error => {
                console.error("Error updating profile photo:", error);
                showInfo("Error updating profile photo: " + error.message);
            });
    }
  function showExistingPhotos() {
        if (!currentUser) {
            showInfo("Please login first.");
            return;
        }

        const path = `users/${currentUser.objectId}/photos/`;

        Backendless.Files.listing(path, '*', true) // Загружаем все файлы из директории
            .then(files => {
                const imageFiles = files.filter(file =>
                    file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)
                );

                if (imageFiles.length === 0) {
                    $('#avatar-selection-modal .modal-body').html(
                        '<p class="text-center">No photos found. Please upload some photos first.</p>'
                    );
                } else {
                    const photosHtml = imageFiles.map(file => `
                    <div class="col-4 mb-3">
                        <div class="card">
                            <img src="${file.fileURL}" class="card-img-top" style="height: 150px; object-fit: cover;">
                            <div class="card-body text-center">
                                <input type="radio" name="selected_photo" value="${file.fileURL}" class="form-check-input">
                            </div>
                        </div>
                    </div>
                `).join('');

                    $('#avatar-selection-modal .modal-body').html(`
                    <div class="row">
                        ${photosHtml}
                    </div>
                `);
                }

                $('#avatar-selection-modal').modal('show');
            })
            .catch(error => {
                console.error("Error loading photos:", error);
                showInfo("Error loading photos: " + error.message);
            });
    }

  function handleProfilePhotoUpload(event) {
        if (!currentUser) {
            showInfo("Please login first");
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        // Проверка типа файла
        if (!file.type.startsWith('image/')) {
            showInfo("Please select a valid image file.");
            return;
        }

        showInfo('Uploading profile photo...');

        // Создаем уникальный путь для файла
        const photoPath = `users/${currentUser.objectId}/photos/${Date.now()}_${file.name}`;

        // Загружаем файл
        Backendless.Files.upload(file, photoPath, true)
            .then(uploadedFile => {
                // Обновляем профиль пользователя с новым URL фото
                return Backendless.UserService.update({
                    objectId: currentUser.objectId,
                    profilePhoto: uploadedFile.fileURL
                });
            })
            .then(updatedUser => {
                currentUser = updatedUser;
                $('#profile-avatar').attr('src', currentUser.profilePhoto); // Обновляем аватар в интерфейсе
                showInfo("Profile photo updated successfully.");
            })
            .catch(error => {
                console.error("Error uploading photo:", error);
                showInfo("Error uploading photo: " + error.message);
            });
    }

  function updateProfilePhoto() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const path = `users/${currentUser.objectId}/profile-photos`;

    Backendless.Files.listing(path)
        .then(function(files) {
          const imageFiles = files.filter(file =>
              file.name.match(/\.(jpg|jpeg|png|gif)$/i)
          );

          const modalContent = imageFiles.length ?
              `<div class="row">
            ${imageFiles.map(file => `
              <div class="col-4 mb-3">
                <div class="card">
                  <img src="${file.publicUrl}" class="card-img-top" style="height: 150px; object-fit: cover;">
                  <div class="card-body text-center">
                    <div class="form-check">
                      <input class="form-check-input" type="radio" name="avatar" value="${file.publicUrl}" id="photo-${file.name}">
                      <label class="form-check-label" for="photo-${file.name}">
                        Select
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>` :
              '<p class="text-center">No photos found. Please upload some photos first.</p>';

          $('#avatar-selection-modal .modal-body').html(modalContent);
          $('#avatar-selection-modal').modal('show');
        })
        .catch(onError);
  }

// Function to save the selected photo as profile avatar
  function saveSelectedAvatar() {
    const selectedPhoto = $('input[name="avatar"]:checked').val();

    if (!selectedPhoto) {
      showInfo("Please select a photo first");
      return;
    }

    Backendless.UserService.update({
      objectId: currentUser.objectId,
      profilePhoto: selectedPhoto
    })
        .then(function(updatedUser) {
          currentUser = updatedUser;
          $('#profile-avatar').attr('src', currentUser.profilePhoto);
          $('#avatar-selection-modal').modal('hide');
          showInfo("Profile photo updated successfully");
        })
        .catch(onError);
  }
// Function to update avatar display in UI
  function updateAvatarDisplay() {
    const avatarUrl = currentUser.avatar || '/placeholder-avatar.png';
    $('#profile-avatar').attr('src', avatarUrl);
  }

  function navigateToFileManagement() {
    $('.carousel').carousel(4); // Navigate to File Management section
  }

  function navigateToProfile() {
    $('.carousel').carousel(5); // Navigate to User Profile section
  }

  function navigateToPlaces() {
    $('.carousel').carousel(6); // Navigate to Places section
  }
  function createUser() {
    var user = new Backendless.User();

    $('.register-field').each(function () {
      var propertyName = $(this)[0].name;
      user[propertyName] = $(this)[0].value;
    });

    if (!validateUser(user)) return;

    showInfo('Creating user and setting up file structure...');

    Backendless.UserService.register(user)
        .then(function (registeredUser) {
          return createUserFolder(registeredUser.name);
        })
        .then(function () {
          return createSharedFolder(user.name);
        })
        .then(function () {
          showInfo("User successfully created and file structure set up. Please check your email to confirm the registration.");
        })
        .catch(onError);
  }

  function validateUser(user) {
    if (!validateEmail(user.email)) {
      showInfo("Invalid email address");
      return false;
    }
    if (!user.name || user.name.trim() === "") {
      showInfo("The name field is required.");
      return false;
    }
    if (parseInt(user.age) < 5) {
      showInfo("Registration is not allowed for users under 5 years old");
      return false;
    }
    if (!user.password || !user.email || !user.name || !user.age || !user.gender || !user.country) {
      showInfo("All fields are required");
      return false;
    }
    return true;
  }

  function loginUser() {
    var login = {};

    $('.login-field').each(function () {
      var propertyName = $(this)[0].name;
      login[propertyName] = $(this)[0].value;
    });

    showInfo('Logging in...');

    Backendless.UserService.login(login.email, login.password)
        .then(function (user) {
          currentUser = user;
          loadUserProfile();
          showInfo("Login successful");
        })
        .catch(onError);
  }
  function getFileExtension(filename) {
    return filename.substring(filename.lastIndexOf('.'));
  }
  function loadUserProfile() {
    if (currentUser) {
      // Загружаем фото профиля, если оно есть

      // Используем profilePhoto пользователя или defaultAvatar если фото нет
      const defaultAvatar = '/assets/placeholder-avatar.png'; // или '/images/placeholder-avatar.png'
      const profilePhotoUrl = currentUser.profilePhoto || defaultAvatar;
      $('#profile-avatar').attr('src', profilePhotoUrl);
      // Заполняем поля профиля
      $('#profile-name').val(currentUser.name || '');
      $('#profile-email').val(currentUser.email || '');
      $('#profile-age').val(currentUser.age || '');
      $('#profile-gender').val(currentUser.gender || '');
      $('#profile-country').val(currentUser.country || '');
    }
  }
  function resetPassword() {
    var email = $('#forgot-password-email').val();

    if (!validateEmail(email)) {
      showInfo("Invalid email address");
      return;
    }

    showInfo('Sending password reset email...');

    Backendless.UserService.restorePassword(email)
        .then(function () {
          showInfo("Password reset instructions have been sent to your email");
        })
        .catch(onError);
  }

  function createUserFolder(username) {
    var folderPath = "/" + username;
    return Backendless.Files.createDirectory(folderPath);
  }

  function createSharedFolder(username) {
    var sharedFolderPath = "/" + username + "/shared_with_me";
    return Backendless.Files.createDirectory(sharedFolderPath);
  }

  function createFolder() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var folderName = $('#folder-name').val();
    var path = "/" + currentUser.name + "/" + folderName;

    Backendless.Files.createDirectory(path)
        .then(function () {
          showInfo("Folder created successfully");
        })
        .catch(onError);
  }

  function deleteItem() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var itemName = $('#item-name').val();
    var path = "/" + currentUser.name + "/" + itemName;

    Backendless.Files.remove(path)
        .then(function () {
          showInfo("Item deleted successfully");
        })
        .catch(onError);
  }

  function listFiles() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var path = "/" + currentUser.name;

    Backendless.Files.listing(path)
        .then(function (files) {
          var fileList = files.map(function(file) {
            return file.name;
          }).join(', ');
          showInfo("Files in your directory: " + fileList);
        })
        .catch(onError);
  }

  function uploadFile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var fileInput = $('#file-input')[0];
    var file = fileInput.files[0];
    var path = "/" + currentUser.name + "/" + file.name;

    Backendless.Files.upload(file, path, true)
        .then(function (result) {
          showInfo("File uploaded successfully");
        })
        .catch(onError);
  }

  function downloadFile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var fileName = $('#file-name').val();
    var path = "/" + currentUser.name + "/" + fileName;

    Backendless.Files.download(path)
        .then(function (blob) {
          var url = window.URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
        })
        .catch(onError);
  }

  function shareFile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var fileName = $('#share-file-name').val();
    var shareWithUser = $('#share-with-user').val();

    var filePath = "/" + currentUser.name + "/" + fileName;
    var sharedFilePath = "/" + shareWithUser + "/shared_with_me/" + fileName;

    Backendless.Files.copyFile(filePath, sharedFilePath)
        .then(function () {
          showInfo("File shared successfully");
        })
        .catch(onError);
  }

  function listSharedFiles() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var path = "/" + currentUser.name + "/shared_with_me";

    Backendless.Files.listing(path)
        .then(function (files) {
          var fileList = files.map(function(file) {
            return file.name;
          }).join(', ');
          showInfo("Shared files: " + fileList);
        })
        .catch(onError);
  }

  function takeAndUploadPhoto() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    // This function is a placeholder as it requires device-specific implementation
    showInfo("This function requires device-specific implementation for taking photos.");
  }
  function updateProfile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    // Update user profile fields
    currentUser.name = $('#profile-name').val();
    currentUser.email = $('#profile-email').val();
    currentUser.age = $('#profile-age').val();
    currentUser.gender = $('#profile-gender').val();
    currentUser.country = $('#profile-country').val();

    Backendless.UserService.update(currentUser)
        .then(function (updatedUser) {
          currentUser = updatedUser;
          showInfo("Profile updated successfully");
        })
        .catch(onError);
  }
  let trackingInterval;
  function toggleLocationTracking() {
        if (!currentUser) {
            showInfo("Please login first");
            return;
        }

        if (trackingInterval) {
            // Отключаем отслеживание
            clearInterval(trackingInterval);
            trackingInterval = null;
            showInfo("Location tracking disabled.");
        } else {
            // Включаем отслеживание
            showInfo("Location tracking enabled.");
            trackingInterval = setInterval(() => {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        const { latitude, longitude } = position.coords;

                        // Сохраняем местоположение в поле "my location" пользователя
                        currentUser["my location"] = {
                            type: "Point",
                            coordinates: [longitude, latitude]
                        };

                        Backendless.UserService.update(currentUser)
                            .then(updatedUser => {
                                currentUser = updatedUser;
                                console.log("Location updated:", currentUser["my location"]);
                            })
                            .catch(error => {
                                console.error("Error updating location:", error);
                            });
                    },
                    error => {
                        console.error("Geolocation error:", error);
                    },
                    { enableHighAccuracy: true }
                );
            }, 60000); // Интервал 60 секунд
        }
    }


  function addPlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    // Собираем данные из полей
    const latitude = parseFloat($('#place-latitude').val());
    const longitude = parseFloat($('#place-longitude').val());

    const place = {
      category: $('#place-category').val(),
      description: $('#place-description').val(),
      hashtags: $('#place-tags').val().split(',').join(','), // Хештеги как строка
      location: { type: "Point", coordinates: [longitude, latitude] }, // Формат GeoJSON
      name: parseInt($('#place-name').val()), // ID места
      ownerId: currentUser.objectId
    };

    // Сохраняем место в таблицу "Place"
    Backendless.Data.of("Place").save(place)
        .then(savedPlace => {
          showInfo(`Place added successfully: ${savedPlace.objectId}`);
        })
        .catch(error => {
          console.error("Error adding place:", error);
          showInfo("Error adding place: " + error.message);
        });
  }



  function deletePlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const placeName = parseInt($('#place-to-delete').val());

    Backendless.Data.of("Place")
        .findFirst({ where: `name = ${placeName} AND ownerId = '${currentUser.objectId}'` })
        .then(place => {
          if (place) {
            return Backendless.Data.of("Place").remove(place);
          } else {
            showInfo("You can only delete your own places.");
          }
        })
        .then(() => showInfo("Place deleted successfully"))
        .catch(onError);
  }


  function searchPlaces() {
    const searchQuery = $('#place-search-query').val(); // Текст поиска
    const searchCategory = $('#place-search-category').val(); // Категория
    const radius = parseFloat($('#search-radius').val()); // Радиус поиска (в км)

    // Получение текущей геопозиции пользователя
    navigator.geolocation.getCurrentPosition(
        position => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          // Создаём запрос для Backendless
          const whereClauses = [];

          // Фильтр по тексту поиска
          if (searchQuery) {
            whereClauses.push(`description LIKE '%${searchQuery}%'`);
          }

          // Фильтр по категории
          if (searchCategory) {
            whereClauses.push(`category = '${searchCategory}'`);
          }

          // GeoJSON формат для фильтрации по местоположению
          const geoFilter = {
            "location": {
              "$nearSphere": {
                "$geometry": { "type": "Point", "coordinates": [longitude, latitude] },
                "$maxDistance": radius * 1000 // Перевод в метры
              }
            }
          };

          // Собираем финальное условие
          const queryBuilder = Backendless.DataQueryBuilder.create();
          queryBuilder.setWhereClause(whereClauses.join(" AND "));
          queryBuilder.setProperties(["objectId", "category", "description", "location", "hashtags"]);
          queryBuilder.setPageSize(20);

          Backendless.Data.of("Place").find(queryBuilder)
              .then(places => {
                if (places.length > 0) {
                  const resultList = places.map(place => {
                    const location = place.location?.coordinates ? place.location.coordinates.join(", ") : "Location not available";
                    return `
                                <div>
                                    <strong>${place.description}</strong><br>
                                    Category: ${place.category}<br>
                                    Hashtags: ${place.hashtags}<br>
                                    Location: ${location}
                                </div><hr>
                            `;
                  }).join("");

                  $('#search-results').html(resultList);
                  showInfo("Places found successfully.");
                } else {
                  $('#search-results').html("<p>No places found matching the criteria.</p>");
                  showInfo("No places found.");
                }
              })
              .catch(error => {
                console.error("Error searching places:", error);
                showInfo("Error searching places: " + error.message);
              });
        },
        error => {
          console.error("Geolocation error:", error);
          showInfo("Failed to retrieve current location.");
        }
    );
  }



  function likePlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const placeName = parseInt($('#place-to-like').val());

    Backendless.Data.of("Place")
        .findFirst({ where: `name = ${placeName}` })
        .then(place => {
          if (!place) {
            showInfo("Place not found.");
            return Promise.reject();
          }

          // Проверяем, лайкал ли пользователь уже это место
          return Backendless.Data.of("Place_Likes")
              .findFirst({ where: `placeId = '${place.objectId}' AND userId = '${currentUser.objectId}'` })
              .then(existingLike => {
                if (existingLike) {
                  showInfo("You have already liked this place.");
                  return Promise.reject();
                }

                // Сохраняем лайк
                const like = {
                  placeId: place.objectId,
                  userId: currentUser.objectId
                };

                return Backendless.Data.of("Place_Likes").save(like);
              });
        })
        .then(() => showInfo("Place liked successfully"))
        .catch(onError);
  }



  function viewPlaceOnMap() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var placeName = $('#place-to-view').val();

    Backendless.Persistence.of("Place")
        .find({ "name": placeName })
        .then(function (places) {
          if (places.length > 0) {
            var place = places[0];
            // Add code to open a map view and display the place's location
            showInfo("Showing place on map: " + place.name);
          } else {
            showInfo("Place not found");
          }
        })
        .catch(onError);
  }

  function validateEmail(email) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
  }

  function onError(error) {
    console.error("An error occurred:", error);
    showInfo(error.message || "An error occurred");
  }

  function showInfo(text) {
    var carousel = $('.carousel');
    $('#message').text(text);
    carousel.carousel(3);
    carousel.carousel('pause');
  }
})(jQuery, Backendless);