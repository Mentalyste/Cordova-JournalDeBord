var controller = {};

controller.session = {
    imageData: "",
    contact: "",
};
////////////////////////////////////////////////////////////////////////////////
// Controleurs : 1 contrôleur par page, qui porte le nom de la page avec le suffixe Controller
////////////////////////////////////////////////////////////////////////////////

controller.init = function () { // Méthode init appelée au lancement de l'app.
    // Ouverture de la BD. et création si besoin des tables
    model.init(
        function () { // successCB : Si BD prête, on va à la page d'accueil
            // On duplique Header et Footer sur chaque page (sauf la première !)
            $('div[data-role="page"]').each(function (i) {
                if (i)
                    $(this).html($('#Header').html() + $(this).html() + $('#Footer').html());
            });
            // On afficher la page d'accueil
            $.mobile.changePage("#accueil");
        },
        function () { // errorCB : Si problème, on va à la page d'erreur
            $.mobile.changePage("#erreur");
        });
};

///////////////////////////////////////////////////////////////////////////////
// Controleur de la page contact
///////////////////////////////////////////////////////////////////////////////
controller.contactController = {
    pickContact: function () {
        // on réinitialise les champs nom et numero
        $("#contactDisplayName").val("");
        $("#contactPhoneNumber").val("");
        // on appelle la méthode du modèle permettant de récupérer un contact
        // en lui passant en paramètre successCB et errorCB
        model.ContactsDAO.pickContact(
            // successCB : on met à jour dans la vue les champs nom et numero avec le 1er numéro du contact récupéré
            function (unContact) {
                $("#contactDisplayName").val(unContact.Nom);
                $("#contactPhoneNumber").val(unContact.Tel[0]);
                controller.session.contact = unContact;
            },
            // erreurCB : on affiche la page erreur avec un message approprié
            function () {
                plugins.toast.showShortCenter("Pas de contact récupéré");
            }
        );
    },

    insertContact: function () {

        var contact = new model.Contact(0, $("#contactDisplayName").val(), $("#contactPhoneNumber").val())

        model.ContactsDAO.insertContact(contact, function () {

            $("#contactDisplayName").val("");
            $("#contactPhoneNumber").val("");
            plugins.toast.showShortCenter("Enregistrement contact réussie");

            var liElement = $("<option></option>")
                .data("contactId", contact.id)
                .attr("value", contact.id)
                .attr("class", "optContact")
                .text(contact.Nom);

            $("#contactRep").append(liElement);
            $.mobile.changePage("#addNote");

        }, function () {

            plugins.toast.showShortCenter("Erreur : Importation impossible");

        });

    }
};


////////////////////////////////////////////////////////////////////////////////
// Contrôleur de la vue addNote
////////////////////////////////////////////////////////////////////////////////
controller.addNote = {

    init: function () {

        model.ContactsDAO.getAllContacts(function (contacts) {

            $(".optContact").remove();
            for (var i = 0; i < contacts.length; i++) {

                var liElement = $("<option></option>")
                    .data("contactId", contacts[i].id)
                    .attr("value", contacts[i].id)
                    .attr("class", "optContact")
                    .text(contacts[i].Nom);

                $("#contactRep").append(liElement);
            }

            controller.session.imageData = "";
            $.mobile.changePage('#addNote');

        }, function () {
            plugins.toast.showShortCenter("Erreur : get Contacts");
        })


    },

    takePicture: function () {
        // on appelle la méthode du modèle permettant de prendre une photo
// en lui passant en paramètre successCB et errorCB
        window.model.ImageDAO.takePicture(
            // successCB : on met à jour dans la vue le champ cameraImage
            function (imageData) {

                controller.session.imageData = imageData;

                plugins.toast.showShortCenter(
                    "Image enregistrée");

            },
// erreurCB : on affiche un message approprié
            function () {
                plugins.toast.showShortCenter(
                    "Impossible de prendre une photo");
            }
        );
    },

    importContact: function () {
        $("#importButton").css("display", "inline");
        $.mobile.changePage("#contact");
    },
    creerContact: function () {
        $("#importButton").css("display", "none");
        $.mobile.changePage("#contact");
    },

    save: function () {
        // "validation" du formulaire
        var titre = $("#addNoteTitre").val();
        var texte = $("#addNoteTexte").val();
        var contacts = JSON.stringify($("#contactRep").val());
        var contactArray = jQuery.parseJSON(contacts);
        if (titre === "") {
            plugins.toast.showShortCenter("Entrez un Titre SVP");
            return;
        }
        if (texte === "") {
            plugins.toast.showShortCenter("Entrez un Texte svp");
            return;
        }
        var ladate = new Date();
        var date = ladate.getFullYear() + "-" + (ladate.getMonth() + 1) + "-" + ladate.getDate() + " " + addZero(ladate.getHours()) + ":" + addZero(ladate.getMinutes()) + ":" + addZero(ladate.getSeconds());

        //recup gps

        model.PositionDAO.pickLocation(
            function (position) { //successCB
                var position = position;


                var newNote = new model.Note(0, titre, texte, date, controller.session.imageData, position.coords.latitude, position.coords.longitude); // on crée une entité
                model.NoteDAO.insert(newNote, // puis on essaye de la sauver en BD
                    function () { // successCB
                        plugins.toast.showShortCenter('Note ' + newNote.id + ' Enregistrée');

                        for(var i=0; i<contactArray.length;i++){
                            model.NoteDAO.insertJointure(newNote.id,contactArray[i],function () {
                                plugins.toast.showShortCenter("Jointure ok");

                            },function () {
                                plugins.toast.showShortCenter("Erreur jointure");
                            });
                        }
                        $("#addNoteTitre").val("");
                        $("#addNoteTexte").val("");
                        $.mobile.changePage("#accueil");
                    },
                    function () { // errorCB
                        plugins.toast.showShortCenter("Erreur : note non enregistrée");
                    }
                );


            },
            function () {
                plugins.toast.showShortCenter("Erreur : impossible de trouver la position");
            });

    }
};

controller.updateNote = {

    save : function () {

        var titre = $("#updateTitre").val();
        var texte = $("#updateTexte").val();
        var id = $("#idNote").text();

        if (titre === "") {
            plugins.toast.showShortCenter("Entrez un Titre SVP");
            return;
        }
        if (texte === "") {
            plugins.toast.showShortCenter("Entrez un Texte svp");
            return;
        }
        var tmpNote = new model.Note(id,titre,texte,"","",0,0);
        model.NoteDAO.updateNote(tmpNote,function () {
            plugins.toast.showShortCenter("Mise à jour réussie");

            $.mobile.changePage("#listNote");

        },function () {
            plugins.toast.showShortCenter("Erreur lors de la mise à jour");
        });


    },

    edit : function (id) {

        model.NoteDAO.findById(id,
            function (uneNote) { // successCB

                if( $(".image").length) {
                    $(".image").remove();
                }
                if($(".MapsButton").length) {
                    $(".MapsButton").remove();
                }

                $("#idNote").html(uneNote.id);
                $("#updateTitre").attr("value",uneNote.titre);
                $("#updateTexte").attr("value",uneNote.texte);
                $("#Date").html(uneNote.date);

                var anchor = document.createElement("button");
                anchor.setAttribute("class","MapsButton");
                anchor.innerHTML = "Voir sur Google Map";
                anchor.onclick = function () {
                    uneNote.showInBrowser()
                };
                $("#Date").after(anchor);


                if(uneNote.imageData !="") {
                    var img = $("<img></img>");
                    img.attr("src", uneNote.getBase64());
                    img.attr("width", "80%");
                    img.attr("height", "80%");
                    img.attr("class", "image");

                    $(".photosContenu").after(img);
                }

                $(".contactDetails").remove();

                model.ContactsDAO.getContactsNote(uneNote.id,function (contacts) {

                    for(var i=0; i<contacts.length;i++){
                        var liElement = $("<li></li>").attr("class", "contactDetails").text(contacts[i].Nom);
                        $("#oneNoteContacts").append(liElement);
                    }

                },function () {
                    plugins.toast.showShortCenter("get contact by id error");
                });

                $.mobile.changePage("#updateNote");

            },
            function () { // errorCB
                plugins.toast.showShortCenter("Note non disponible");
            }
        );

    }

};

////////////////////////////////////////////////////////////////////////////////
// Contrôleur de la vue listNote
////////////////////////////////////////////////////////////////////////////////
controller.listNote = {
    // Définit le contenu de la listView
    fillListView: function () {
        model.NoteDAO.findAll(
            function (lesNotes) { // successCB
                $("#listNoteContenu").empty();
                for (var i = 0; i < lesNotes.length; i++) {
                    var liElement = $("<li></li>").data("noteId", lesNotes[i].id);
                    var aElement = $("<a></a>")
                        .data("noteId", lesNotes[i].id)
                        .text(lesNotes[i].id + ". " + lesNotes[i].titre);
                    // un click sur une note permet d'en afficher le détail
                    liElement.on("click", function () {
                        controller.listNote.goToDetailNote($(this));
                    });
                    // un swipe sur une note permet de la supprimer
                    liElement.on("swipe", function () {
                        controller.listNote.removeNote($(this));
                    });
                    $("#listNoteContenu").append(liElement.append(aElement));
                }
                $("#listNoteContenu").listview("refresh");
            },
            function () { // errorCB
                $("#listNoteContenu").html("<li>Pas de Notes</li>");
                $("#listNoteContenu").listview("refresh");
            });
    },
    // Définit le contenu de la vue detailNote en fonction de la note cliquée
    goToDetailNote: function (listViewElement) {
        var noteId = listViewElement.data("noteId");
        model.NoteDAO.findById(noteId,
            function (uneNote) { // successCB

                $(".image").remove();

                $(".MapsButton").remove();


                $(".EditButton").attr("id",uneNote.id);
                $("#oneNoteId").html(uneNote.id);
                $("#oneNoteTitre").html(uneNote.titre);
                $("#oneNoteTexte").html(uneNote.texte);
                $("#oneNoteDate").html(uneNote.date);
                $("#oneNotePosition").html("Latitude : " + uneNote.latitude + "<br/> Longitude : " + uneNote.longitude);
                //$("#oneNoteMap").click(unePosition.showInBrowser());

                var anchor = document.createElement("button");
                anchor.setAttribute("class","MapsButton");
                anchor.innerHTML = "Voir sur Google Map";
                anchor.onclick = function () {
                    uneNote.showInBrowser()
                };
                $("#oneNotePosition").after(anchor);


                if(uneNote.imageData !="") {
                    var img = $("<img></img>");
                    img.attr("src", uneNote.getBase64());
                    img.attr("width", "80%");
                    img.attr("height", "80%");
                    img.attr("class", "image");

                    $(".photosContenu").after(img);
                }

                $(".contactDetails").remove();


                model.ContactsDAO.getContactsNote(uneNote.id,function (contacts) {

                    for(var i=0; i<contacts.length;i++){
                        var liElement = $("<li></li>").attr("class", "contactDetails").text(contacts[i].Nom);
                        $("#oneNoteContacts").append(liElement);
                    }

                },function () {
                    plugins.toast.showShortCenter("get contact by id error");
                });

                $.mobile.changePage("#detailNote");

            },
            function () { // errorCB
                plugins.toast.showShortCenter("Note non disponible");
            }
        );
    },
    // Supprime la note balayée et met à jour la listView
    removeNote: function (listViewElement) {
        var noteId = listViewElement.data("noteId");
        model.NoteDAO.removeById(noteId,
            function () { // successCB
                plugins.toast.showShortCenter("Note " + noteId + " supprimée");
                listViewElement.remove();
            },
            function () { // errorCB
                plugins.toast.showShortCenter("Note " + noteId + " non supprimée");
            }
        );
    }
};
// Pour initialiser la listView quand on arrive sur la vue
$(document).on("pagebeforeshow", "#listNote", function () {
    controller.listNote.fillListView();
});
