var model = {
    db: null // objet pour manipuler la BD sqllite
};

// Initialisation du modèle : ouverture de la BD
// successCtrlCB : méthode du contrôleur appelée si BD prête
// errorCtrlCB   : méthode du contrôleur appelée si problème lors de l'ouverture
model.init = function (successCtrlCB, errorCtrlCB) {
    this.db = sqlitePlugin.openDatabase({name: "notes.db", location: 'default'},
        function () {
            var succCB = successCtrlCB; // pbm de visibilité
            var errCB = errorCtrlCB;    // pbm de visibilité
            model.db.executeSql("CREATE TABLE IF NOT EXISTS note (id INTEGER PRIMARY KEY, titre TEXT, texte TEXT, date DATETIME, imageData blob, latitude FLOAT, longitude FLOAT)", [],
                function () {
                    succCB.call(this);
                },
                function () {
                    errCB.call(this);
                });

            model.db.executeSql("CREATE TABLE IF NOT EXISTS jointure_Note_Contact (id_note INTEGER , id_contact INTEGER)", [],
                function () {
                    succCB.call(this);
                },
                function () {
                    errCB.call(this);
                });

            model.db.executeSql("CREATE TABLE IF NOT EXISTS contact (id INTEGER PRIMARY KEY , nom TEXT, numero INTEGER)", [],
                function () {
                    succCB.call(this);
                },
                function () {
                    errCB.call(this);
                });
        },
        function () {
            errorCtrlCB.call(this);
        });
};

model.ImageDAO = {

    takePicture : function (successCB, errorCB) {
        navigator.camera.getPicture(
            function (imageData) {
                // imageData contient l'image capturée au format Base64, sans en-tête MIME
// On appelle successCB en lui transmettant une entité Image
                successCB.call(this, imageData);
            },
            function (err) {
                console.log("Erreur Capture image : " + err.message);
                errorCB.call(this);
            },
            {quality: 50, destinationType: navigator.camera.DestinationType.DATA_URL}
            // qualité encodage 50%, format base64 (et JPEG par défaut)
        )
    },

};

model.ContactsDAO = {

    getContactsNote: function (id_note,successCtrlCB, errorCtrlCB) {
        model.db.executeSql("SELECT * FROM contact c INNER JOIN jointure_Note_Contact j ON j.id_contact=c.id WHERE id_note=?", [id_note],
            function (res) { // succes
                var lesContacts = [];
                for (var i = 0; i < res.rows.length; i++) {
                    var unContact = new model.Contact(res.rows.item(i).id, res.rows.item(i).nom, res.rows.item(i).numero);
                    lesContacts.push(unContact);
                }
                successCtrlCB.call(this, lesContacts);
            },
            function (err) { // erreur
                errorCtrlCB.call(this);
            }
        );
    },

    getAllContacts: function (successCtrlCB, errorCtrlCB) {
        model.db.executeSql("SELECT * FROM contact", [],
            function (res) { // succes
                var lesContacts = [];
                for (var i = 0; i < res.rows.length; i++) {
                    var unContact = new model.Contact(res.rows.item(i).id, res.rows.item(i).nom, res.rows.item(i).numero);
                    lesContacts.push(unContact);
                }
                successCtrlCB.call(this, lesContacts);
            },
            function (err) { // erreur
                errorCtrlCB.call(this);
            }
        );
    },

    pickContact : function (successCB, errorCB) {
        navigator.contacts.pickContact(
            function (contactTel) {

                // On récupère tous les numéros de tél du contactTel
                var phoneNumbers = [];

                for (var i = 0; i < contactTel.phoneNumbers.length; i++) {
                    phoneNumbers.push(contactTel.phoneNumbers[i].value);
                }
                // On crée une entité Contact
                var unContact = new model.Contact(0,contactTel.displayName, phoneNumbers);
                // On appelle successCB en lui transmettant l'entité Contact
                successCB.call(this, unContact);
            },
            function (err) {
                console.log("Erreur Capture Contact : " + err.message);
                errorCB.call(this);
            }
        );
    },

    insertContact: function (contact,successCtrlCB,errorCtrlCB){

        var UnContact = contact;
        model.db.executeSql(
            "INSERT INTO contact (nom,numero) VALUES (?,?)", [UnContact.Nom,UnContact.Tel],
            function (res) { // succes
                contact.id = res.insertId; // on met à jour l'id de la note après insertion en BD
                successCtrlCB.call(this);     // et on appelle la successCtrlCB en provenance du contrôleur
            },
            function (err) { // erreur
                console.log(err);
                errorCtrlCB.call(this); // on appelle l'errorCtrlCB en provenance du contrôleur
            }
        );

    },

};


// Définition de l'Entité Note
model.Note = function (id, titre, texte, date,imageData,latitude,longitude) {
    this.id = id;
    this.titre = titre;
    this.texte = texte;
    this.date = date;
    this.imageData = imageData;
    this.latitude=latitude;
    this.longitude=longitude;

    this.showInBrowser = function () {
        var url = "https://maps.google.com/?q=" + this.latitude + "°," + this.longitude + "°";
        window.cordova.InAppBrowser.open(url, '_blank', 'location=yes');
    },
    this.getBase64 = function() {
        return "data:image/jpeg;base64,"+this.imageData;
    };
};

model.Location = function (id,latitude, longitude) {
    this.id=id;
    this.latitude = latitude;
    this.longitude = longitude;
    // Méthode pour visualiser une position dans un navigateur web
    this.showInBrowser = function () {
        var url = "https://maps.google.com/?q=" + this.latitude + "°," + this.longitude + "°";
        window.cordova.InAppBrowser.open(url, '_blank', 'location=yes');
    };
};


model.PositionDAO = {

    pickLocation: function (successCB, errorCB) {
        navigator.geolocation.getCurrentPosition(
            function (position) {
                // On instantie une entité Location
                //var location = new window.model.Location(0,position.coords.latitude, position.coords.longitude);
                // On appelle successCB en lui transmettant l'entité Location
                successCB.call(this, position );
            },
            function (err) {
                console.log("Erreur Capture GPS : " + err.message);
                errorCB.call(this);
            },
// Options : position en cache de max 3s, 10s maxi pour répondre, position GPS exacte demandée
            {maximumAge: 3000, timeout: 10000, enableHighAccuracy: true}
        );
    },
};

model.Contact = function (id,nom, tel) {
    this.id=id;
    this.Nom = nom;
    this.Tel = tel;
};

model.NoteDAO = {
// Requête pour insérer une nouvelle note en BD
// successCtrlCB : méthode du contrôleur appelée en cas de succès
// errorCtrlCB   : méthode du contrôleur appelée en cas d'échec
    insert: function (uneNote, successCtrlCB, errorCtrlCB) {
        console.log(uneNote);
        var laNote = uneNote;
        model.db.executeSql(
            "INSERT INTO note (titre, texte, date,imageData,latitude,longitude) VALUES (?,?,?,?,?,?)", [uneNote.titre, uneNote.texte, uneNote.date, uneNote.imageData,uneNote.latitude,uneNote.longitude],
            function (res) { // succes
                laNote.id = res.insertId; // on met à jour l'id de la note après insertion en BD
                successCtrlCB.call(this);     // et on appelle la successCtrlCB en provenance du contrôleur
            },
            function (err) { // erreur
                console.log(err);
                errorCtrlCB.call(this); // on appelle l'errorCtrlCB en provenance du contrôleur
            }
        );
    },

    updateNote : function(tmpNote, successCtrlCB, errorCtrlCB){

        var note=tmpNote
        model.db.executeSql(
            "UPDATE note SET titre=?,texte=? WHERE id=?", [note.titre, note.texte, note.id],
            function (res) { // succes
                successCtrlCB.call(this);     // et on appelle la successCtrlCB en provenance du contrôleur
            },
            function (err) { // erreur
                console.log(err);
                errorCtrlCB.call(this); // on appelle l'errorCtrlCB en provenance du contrôleur
            }
        );

    },

    insertJointure: function (idNote,idContact, successCtrlCB, errorCtrlCB) {
        model.db.executeSql(
            "INSERT INTO jointure_Note_Contact (id_note, id_contact) VALUES (?,?)", [idNote,idContact],
            function (res) { // succes
                successCtrlCB.call(this);     // et on appelle la successCtrlCB en provenance du contrôleur
            },
            function (err) { // erreur
                console.log(err);
                errorCtrlCB.call(this); // on appelle l'errorCtrlCB en provenance du contrôleur
            }
        );
    },
// Requête pour récupérer toutes les notes
// successCtrlCB recevra en paramètre le tableau de toutes les entités Note
    findAll: function (successCtrlCB, errorCtrlCB) {
        model.db.executeSql("SELECT * FROM note ORDER BY date", [],
            function (res) { // succes
                var lesNotes = [];
                for (var i = 0; i < res.rows.length; i++) {
                    var uneNote = new model.Note(res.rows.item(i).id, res.rows.item(i).titre, res.rows.item(i).texte, res.rows.item(i).date,res.rows.item(i).imageData,res.rows.item(i).latitude,res.rows.item(i).longitude);
                    lesNotes.push(uneNote);
                }
                successCtrlCB.call(this, lesNotes);
            },
            function (err) { // erreur
                errorCtrlCB.call(this);
            }
        );
    },
// Requête pour récupérer une note selon son id
// successCtrlCB recevra en paramètre l'entité Note
    findById: function (id, successCtrlCB, errorCtrlCB) {
        model.db.executeSql("SELECT * FROM note WHERE id = ?", [id],
            function (res) { // success
                console.log(res.rows.item(0));
                var uneNote = new model.Note(res.rows.item(0).id, res.rows.item(0).titre, res.rows.item(0).texte, res.rows.item(0).date,res.rows.item(0).imageData,res.rows.item(0).latitude,res.rows.item(0).longitude);
                successCtrlCB.call(this, uneNote);
            },
            function (err) { // erreur
                errorCtrlCB.call(this);
            }
        );
    },
// Requête pour supprimer une note selon son id
    removeById: function (id, successCtrlCB, errorCtrlCB) {
        model.db.executeSql("DELETE FROM note WHERE id = ?", [id],
            function (res) { //succes
                successCtrlCB.call(this);
            },
            function (err) { // erreur
                errorCtrlCB.call(this);
            }
        );
    }
};

