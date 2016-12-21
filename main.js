new Vue({
    name: 'MainApp',
    el: "#app",
    data: {
        name: '',
        note: '',
        studyCards: [],
        isEditing: false,
        idToEdit: false
    },
    computed: {
        memorizedCards() {
            return this.studyCards.filter((card) => card.fields.Memorized)
        },
        unMemorizedCards() {
            return this.studyCards.filter((card) => !card.fields.Memorized)
        }
    },
    created,
    methods: {
        saveCard,
        updateCardStatus,
        initCardToEdit,
        cancelEditCard,
        updateCard,
        deleteCard,
        editCard,
        clearForm,
        setStudyCardsArr
    }
})

/**
 * Step 1: Created Life Cycle Hook
 * 
 * Grab our current studyCards on startup and save them to the 'studyCards' array on our 'data' property.
 */
function created() {
    axios.get(`https://api.airtable.com/v0/appgyWdA8yP0KXZr4/My%20Study%20Cards?maxRecords=20&view=Main%20View&api_key=${airtableKey}`)
        .then((resp) => {
            console.log('response', resp)

            // 1-1 If we retrieve records successfully, add them to our studyCards list.
            if (resp.status === 200 && resp.data.records.length > 0) {
                this.studyCards = resp.data.records
            } else {
                // Not much error handling happening here.
                console.error('Unable to retrieve study cards. Please refresh the page and try again.')
            }
        })
}

/**
 * Step 2: Save a New Card to Airtable
 */
function saveCard() {

    // 2-1 return early if either of the required fields are empty
    if (!this.name || !this.note) {
        return
    }

    // 2-2 Create the payload object as stated in Airtable's api documentation
    const payload = {
        fields: {
            Name: this.name,
            Notes: this.note,
            Memorized: false, // Not necessary, but I like to be explicit
            Attachments: []
        }
    }

    // 2-3 Send the data
    axios.post(`https://api.airtable.com/v0/appgyWdA8yP0KXZr4/My%20Study%20Cards?api_key=${airtableKey}`, payload)
        .then((resp) => {

            if (resp.status === 200 && resp.data.id) {

                // 2-4 If we're successful, update the studyCards array
                this.studyCards.push(resp.data)

                // 2-5 Clear the form so we can create another task if we want.
                this.clearForm()

            } else {
                console.error('Unable to save card.', payload)
            }
        })
}

/**
 * Step 3: Update Card Status - Memorized is TRUE or FALSE
 * 
 * @param (object) studyCard According to the API documentation, the entire studyCard object is required for a put.
 */
function updateCardStatus(studyCard) {

    // 3-1 Create the payload object.
    const payload = {
        fields: studyCard.fields
    }

    // 3-2 Edit the card
    this.editCard(studyCard.id, payload)
}

/**
 * Step 4: Delete a Card
 * 
 * @param {number} studyCardID The .id for the card.
 */
function deleteCard(studyCardID) {

    // 4-1 Send the DELETE request for studyCardID
    axios.delete(`https://api.airtable.com/v0/appgyWdA8yP0KXZr4/My%20Study%20Cards/${studyCardID}?api_key=${airtableKey}`)
        .then((resp) => {

            // 4-2 If the delete is successful we'll filter the delete card from our studyCards array.
            if (resp.status === 200 && resp.data.deleted === true) {
                const updatedCardsArr = this.studyCards.filter((card) => card.id !== studyCardID)

                this.setStudyCardsArr(updatedCardsArr)
            } else {
                console.error('Unable to delete card.')
            }
        })
}

/**
 * Step 5: Select a card from the view and set the values for the study card form.
 */
function initCardToEdit(studyCard) {

    // 5-1 Set isEditing flag as this is used to update the UI.
    this.isEditing = true

    // 5-2 Set the id we want to edit. This is necessary for the PATCH request.
    this.idToEdit = studyCard.id

    // 5-3 Set our v-models so our UI shows the selected card info in the input fields.
    // using destructing because why not.
    const {
        Name,
        Notes
    } = studyCard.fields

    this.name = Name
    this.note = Notes

    // 5-4 Let's make our inputs 'dirty' so Material Design Lite knows to hide the labels:
    document.getElementById('studyCardNameInput').classList.add('is-dirty')
    document.getElementById('studyCardNoteInput').classList.add('is-dirty')
}

/**
 * Step 6: Update our card based on the this.idToEdit and the data in the form fields.
 */
function updateCard() {

    // 6-1 Create the payload object.
    const payload = {
        fields: {
            Name: this.name,
            Notes: this.note
        }
    }

    // 6-2 Edit the card:
    this.editCard(this.idToEdit, payload)
}

/**
 * Step 7: Make the PATCH request to edit the studyCard
 */
function editCard(studyCardID, payload) {
    // 7-2 PATCH request to the db to update the studyCard found at studyCardID
    return axios.patch(`https://api.airtable.com/v0/appgyWdA8yP0KXZr4/My%20Study%20Cards/${studyCardID}?api_key=${airtableKey}`, payload)
        .then((resp) => {

            if (resp.status === 200 && resp.data.id) {

                // 7-3 Find the updated card in our array and replace it.
                // We're affecting this.studyCards array, so our computed properties update our view automatically
                const updatedCardsArr = this.studyCards.map((card) => resp.data.id === card.id ? resp.data : card)

                this.setStudyCardsArr(updatedCardsArr)

                // 7-4 clear the form, our isEditing flag and idToEdit
                this.clearForm();
                this.idToEdit = false
                this.isEditing = false

            } else {
                // handle the error - not something we're doing now.
                console.error('Unable to update card.', payload)
            }

        })
}

/**
 * Step 8: Cancel the editing of a card.
 */
function cancelEditCard() {
    // 8-1 Set isEditing flag to update the view.
    this.isEditing = false

    // 8-2 Reset the id we want to edit.
    this.idToEdit = false

    // 8-3 Clear our form.
    this.clearForm()
}

/**
 * Helper function to clear our form.
 */
function clearForm() {
    // clear the inputs.
    this.name = ''
    this.note = ''

    // Material Lite isn't reactive, so we're going to manually remove the css class so our label re-appear YUCK
    document.getElementById('studyCardNameInput').classList.remove('is-dirty')
    document.getElementById('studyCardNoteInput').classList.remove('is-dirty')
}

/**
 * For something like this, I like to use a 'set...' function.
 * It makes it easier for me to track down where an important property
 * is being changed.
 */
function setStudyCardsArr(data) {
    this.studyCards = data
}