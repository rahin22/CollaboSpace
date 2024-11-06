// QuillJS editor options
const toolbarOptions = {
    container: '#toolbar',
    handlers: {
        link: function (value) {
            if (value) {
                const linkModal = new bootstrap.Modal(document.getElementById('linkModal'));
                linkModal.show();

                document.getElementById('insertLinkButton').onclick = () => {
                    const href = document.getElementById('linkUrl').value;
                    const linkText = document.getElementById('linkText').value;

                    if (href && linkText) {
                        const formattedHref = href.startsWith('http://') || href.startsWith('https://') 
                            ? href 
                            : 'https://' + href;

                        const range = this.quill.getSelection(); 
                        if (range) { 
                            this.quill.deleteText(range.index, linkText.length); 
                            this.quill.insertText(range.index, linkText, { link: formattedHref }, Quill.sources.USER); 
                        } else {
                            const cursorPosition = this.quill.getLength(); 
                            this.quill.insertText(cursorPosition, linkText, { link: formattedHref }, Quill.sources.USER);
                        }

                        linkModal.hide();

                        document.getElementById('linkUrl').value = '';
                        document.getElementById('linkText').value = '';
                    } else {
                        alert("Please enter both the URL and link text.");
                    }
                };
            } else {
                this.quill.format('link', false);
            }
        }
    }
};

// Initialize Quill editor
const quill = new Quill('#editor', {
    modules: {
        syntax: true,  
        toolbar: toolbarOptions  
    },
    placeholder: 'Message',
    theme: 'snow',
});


const submitMessageButton = document.querySelector('#messageForm button[type="submit"]');
submitMessageButton.disabled = true; 

quill.on('text-change', () => {
    const editorContent = quill.getText().trim(); 
    submitMessageButton.disabled = editorContent.length === 0; 
});

const quilLimit = 5000;

quill.on('text-change', function (delta, old, source) {
    if (quill.getLength() > quilLimit) {
      quill.deleteText(quilLimit, quill.getLength());
    }
});
 
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

let currentConversationId;
let channelId;
let conversationType = 'announcement';
let existingDateDividers = new Set();
let isUserAtBottom = true; 

// Channel tabs asynchronous changer
document.querySelectorAll('.channel-tab').forEach(tab => {
    const channelTitle = document.getElementById('channel-title');
    tab.addEventListener('click', async (e) => {
        existingDateDividers.clear(); 
        isUserAtBottom = true;
        document.querySelector('.tabActive').classList.remove('tabActive');
        tab.classList.add('tabActive');
        channelTitle.innerHTML = tab.innerHTML;

        conversationType = tab.getAttribute('data-conversation-type');
        channelId = tab.getAttribute('data-channel-id');
        const response = await fetch(`/get_messages_for_channel/${conversationType}/${channelId}`);
        channelContent.innerHTML = '';
        
        if (response.ok) {
            const data = await response.json();
            const messages = data.messages;
            currentConversationId = data.conversation_id;
            socket.emit('join', { room: currentConversationId });
            const isFirstBatch = data.is_first_batch;
            const dateDividers = data.date_dividers;

            renderMessages(messages, true, isFirstBatch, dateDividers); 
        } else {
            console.error('Error fetching messages:', response.statusText);
        }
    });
});


// Channel messages dynamic loader
const channelContent = document.getElementById('channel-content');        
let loadingOlderMessages = false; 

channelContent.addEventListener('scroll', async () => {
    if (channelContent.scrollTop === 0 && !loadingOlderMessages) {
        loadingOlderMessages = true;

        const firstMessageDiv = channelContent.querySelector('.message');
        console.log('first message div',firstMessageDiv)
        const oldestMessageId = firstMessageDiv ? firstMessageDiv.dataset.messageId : null;

        const response = await fetch(`/get_messages_for_channel/${conversationType}/${channelId}?last_message_id=${oldestMessageId}&limit=10`);

        if (response.ok) {
            const data = await response.json();
            console.log(data)
            const olderMessages = data.messages;

            if (olderMessages.length > 0) {
                const previousHeight = channelContent.scrollHeight;
                const isFirstBatch = data.is_first_batch;
                const dateDividers = data.date_dividers;
                renderMessages(olderMessages, true, isFirstBatch, dateDividers);
                channelContent.scrollTop = channelContent.scrollHeight - previousHeight;
            }

        } else {
            console.error('Error fetching older messages:', response.statusText);
        }

        loadingOlderMessages = false; 
    }
});


 
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------


// Socket.io client-side code
const socket = io(); 
document.getElementById('messageForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const messageContentHTML = quill.root.innerHTML.trim();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messageContentHTML;
    tempDiv.querySelectorAll('select').forEach(select => select.remove());

    const messageContent = tempDiv.innerHTML;

    const messageData = {
        content: messageContent,
        conversation_id: currentConversationId, 
    };

    socket.emit('send_message', messageData); 
    quill.deleteText(0, quill.getLength())
    submitMessageButton.disabled = true;
});

socket.on('new_message', function(message) {
    if (message.conversation_id === currentConversationId) {
        appendMessage(message);
    }
});

socket.on('message_deleted', function(messageId) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    if (messageDiv) {
        messageDiv.remove();
    }
});

socket.on('message_edited', function(message) {
    const messageDiv = document.querySelector(`.message[data-message-id="${message.id}"]`);
    if (messageDiv) {
        const messageContentDiv = messageDiv.querySelector('.message-content');
        messageContentDiv.innerHTML = message.content;
    }
});     

 
// ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



function checkScrollPosition() {
    const channelContent = document.getElementById("channel-content");
    const scrollPosition = channelContent.scrollHeight - channelContent.clientHeight - channelContent.scrollTop;

    const threshold = 100; 

    isUserAtBottom = scrollPosition < threshold;
}


channelContent.addEventListener('scroll', checkScrollPosition);

// Render messages function
function renderMessages(messages, prepend = false, isFirstBatch = false, dateDividers = []) {
    const channelContent = document.getElementById('channel-content');
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'position-relative');
        messageDiv.dataset.messageId = message.id;

        const formattedTimestamp = formatMessageTimestamp(message.timestamp);
        messageDiv.innerHTML = `
            <img src="data:image/png;base64,${message.user.pfp}" alt="" width="32" height="32" class="rounded-circle me-3 mt-2">
            <div class="message-text d-flex flex-column">   
                <div class="message-header d-flex flex-row gap-2">
                    <div class="message-author">
                        <span class="message-author-name fw-bold">${message.user.username}</span>
                    </div>
                    <div class="message-timestamp">
                        <span class="text-muted" style="font-size: 0.75em;" data-timestamp="${message.timestamp}">${formattedTimestamp}</span>
                    </div>
                </div>
                <div class="message-content">
                    ${message.content}
                </div>
            </div>
            <div class="edit-bar btn-group position-absolute border" role="group" style="visibility: hidden;">
                <button type="button" class="btn btn-sm" onclick="editMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Edit Message"><i class="ri-edit-line"></i></button>
                <button type="button" class="btn btn-sm" onclick="deleteMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Delete Message"><i class="ri-delete-bin-6-line text-danger"></i></button>
            </div>
        `;

        messageDiv.addEventListener('mouseenter', () => {
            messageDiv.querySelector('.edit-bar').style.visibility = 'visible';
        });

        messageDiv.addEventListener('mouseleave', () => {
            messageDiv.querySelector('.edit-bar').style.visibility = 'hidden';
        });

        if (prepend) {
            channelContent.prepend(messageDiv);
        } else {
            channelContent.appendChild(messageDiv);
        }
    });

    let lastMessageID = null;
    let lastMessage = null;
    const messageNodes = Array.from(channelContent.children);

    messageNodes.forEach(messageNode => {
        const idElement = messageNode.dataset.messageId;
        if (!idElement) return;

        Object.entries(dateDividers).forEach(([id, messageDate]) => {
            
            if (!existingDateDividers.has(messageDate)) {
                if (lastMessageID !== idElement && id === idElement) {
                    const dateDividerElement = document.createElement('div');
                    dateDividerElement.className = 'date-divider text-center text-muted my-2';
                    dateDividerElement.innerHTML = `
                        <hr class="divider-line">
                        <span class="divider-text">${messageDate}</span>
                        <hr class="divider-line">
                    `;

                    channelContent.insertBefore(dateDividerElement, messageNode);
                    lastMessageID = idElement;
                    existingDateDividers.add(messageDate);
                }
            }
        });

        lastMessage = messageNode;
    });

    if (isFirstBatch) {
        const startMessage = document.createElement('div');
        const channelName = document.querySelector('.tabActive').innerHTML;
        startMessage.classList.add('channel-start-message');
        startMessage.innerHTML = `<h3>Welcome to the ${channelName} messages!</h3>`;
        channelContent.prepend(startMessage);
    }

    channelContent.scrollTop = channelContent.scrollHeight;
    console.log(lastMessage)
}





// appendMessage function
function appendMessage(message) {
    const channelContent = document.getElementById('channel-content');
    const newMessage = document.createElement('div');
    const formattedTimestamp = formatMessageTimestamp(message.timestamp);
    const messageDate = new Date(message.timestamp).toDateString(); 
    const messageDatetoFormat = new Date(message.timestamp)
    const formattedDate = messageDatetoFormat.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}); 

    newMessage.innerHTML = `
        <div class="message position-relative">
            <img src="data:image/png;base64,${message.user.pfp}" alt="" width="32" height="32" class="rounded-circle me-3 mt-2">
            <div class="message-text d-flex flex-column">
                <div class="message-header d-flex flex-row gap-2">
                    <div class="message-author">
                       <span class="message-author-name fw-bold">${message.user.username}</span>
                    </div>
                    <div class="message-timestamp">
                       <span class='text-muted' style="font-size: 0.75em;" data-timestamp="${message.timestamp}">${formattedTimestamp}</span>
                    </div>
                </div>
                <div class="message-content">
                    ${message.content}
                </div>
            </div>

            <div class="edit-bar btn-group position-absolute border" role="group" style='visibility: hidden;'>
                <button type="button" class="btn btn-sm" onclick="editMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Edit Message"><i class="ri-edit-line"></i></button>
                <button type="button" class="btn btn-sm" onclick="deleteMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Delete Message"><i class="ri-delete-bin-6-line text-danger"></i></button>
            </div>
        </div>
    `;

    const previousMessage = channelContent.lastElementChild;
    console.log(previousMessage)
    if (previousMessage) {
        const previousTimestamp = previousMessage.querySelector('.message-timestamp span').dataset.timestamp;
        console.log(previousTimestamp)
        const previousMessageDate = new Date(previousTimestamp).toDateString();

        if (messageDate !== previousMessageDate) {
            const dateDividerElement = document.createElement('div');
            dateDividerElement.className = 'date-divider text-center text-muted my-2';
            dateDividerElement.innerHTML = `
                <hr class="divider-line">
                <span class="divider-text">${formattedDate}</span>
                <hr class="divider-line">
            `;

            channelContent.appendChild(dateDividerElement);
        }
    }

    channelContent.appendChild(newMessage);

    const editBar = newMessage.querySelector('.edit-bar');

    newMessage.addEventListener('mouseenter', () => {
        editBar.style.visibility = 'visible';
    });

    newMessage.addEventListener('mouseleave', () => {
        editBar.style.visibility = 'hidden';
    });

    if (isUserAtBottom) {
        channelContent.scrollTop = channelContent.scrollHeight;
    }
}


// Delete message function
let messageToDelete = null; 

function deleteMessage(messageId) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    messageToDelete = messageDiv;

    const messageContainer = document.getElementById('messageToDeleteContainer');
    messageContainer.innerHTML = ''; 

    const clonedMessageDiv = messageDiv.cloneNode(true);
    const editBar = clonedMessageDiv.querySelector('.edit-bar');
    if (editBar) {
        clonedMessageDiv.removeChild(editBar); 
    }
    messageContainer.appendChild(clonedMessageDiv);

    showModal(deleteMessageModal);

    document.getElementById('confirmDeleteButton').onclick = function () {
        messageToDelete.remove();
        socket.emit('delete_message', { message_id: messageId, conversation_id: currentConversationId });
        deleteMessageModal.hide();
    };
}


// Edit message quill editor initialization
let editQuill;

const editToolbarOptions = {
    container: '#edit-toolbar',
    handlers: {
        link: function (value) {
            if (value) {
                const linkModal = new bootstrap.Modal(document.getElementById('linkModal'));
                linkModal.show();

                document.getElementById('insertLinkButton').onclick = () => {
                    const href = document.getElementById('linkUrl').value;
                    const linkText = document.getElementById('linkText').value;

                    if (href && linkText) {
                        const formattedHref = href.startsWith('http://') || href.startsWith('https://') 
                            ? href 
                            : 'https://' + href;

                        const range = this.quill.getSelection(); 
                        if (range) { 
                            this.quill.deleteText(range.index, linkText.length); 
                            this.quill.insertText(range.index, linkText, { link: formattedHref }, Quill.sources.USER); 
                        } else {
                            const cursorPosition = this.quill.getLength(); 
                            this.quill.insertText(cursorPosition, linkText, { link: formattedHref }, Quill.sources.USER);
                        }

                        linkModal.hide();

                        document.getElementById('linkUrl').value = '';
                        document.getElementById('linkText').value = '';
                    } else {
                        alert("Please enter both the URL and link text.");
                    }
                };
            } else {
                this.quill.format('link', false);
            }
        }
    }
};


// Edit message function
function editMessage(messageId) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const messageContentDiv = messageDiv.querySelector('.message-content');
    const messageTextDiv = messageDiv.querySelector('.message-text');
    const messageContent = messageContentDiv.innerHTML;

    messageContentDiv.style.display = 'none';
    messageDiv.querySelector('.edit-bar').style.display = 'none';

    const existingEditorContainer = messageDiv.querySelector('.editor-message-container');
    if (existingEditorContainer) {
        existingEditorContainer.remove();
    }
    if (editQuill) {
        editQuill = null;
    }

    const editorMessageContainer = document.createElement('div');
    editorMessageContainer.classList.add('editor-message-container', 'rounded-4', 'border', 'mt-2');        

    editorMessageContainer.innerHTML = `
           <div class="mb-3">
               <div id="edit-toolbar">
                   <span class="ql-formats">
                        <button class="ql-bold" data-bs-toggle="tooltip"   data-bs-html="true" data-bs-title="<b>Bold</b> <br> Ctrl + B"></button>
                        <button class="ql-italic" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Italic</b> <br> Ctrl + I"></button>
                        <button class="ql-strike" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Strikethrough</b>"></button>
                   </span>
                   <span class="ql-formats">
                        <button class="ql-link" id="customLinkButton" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Link</b>"></button>
                        <button class="ql-blockquote" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Block Quote</b>"></button>
                        <button class="ql-code-block" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Code Block</b>"></button>
                   </span>
                   <span class="ql-formats">
                        <button class="ql-list" value="ordered" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Ordered List</b>"></button>
                        <button class="ql-list" value="bullet" data-bs-toggle="tooltip" data-bs-html="true" data-bs-title="<b>Bullet List<b>"></button>
                   </span>
               </div>
            </div>

            <div class="d-flex justify-content-end p-2" style="height: fit-content;">
               <div>
                  <button type="button" class="btn btn-outline-secondary btn-sm" onclick="cancelEdit(${messageId})">Cancel</button>
                  <button type="submit" class="btn btn-success btn-sm" onclick="saveEdit(${messageId})">Save</button>
               </div>
            </div>
   `; 

   
   const editorDiv = document.createElement('div');
   editorDiv.id = `editor-${messageId}`; 
   editorDiv.classList.add('overflow-auto');
   editorDiv.style.maxHeight = '40vh'; 
   editorMessageContainer.querySelector('.mb-3').appendChild(editorDiv);

   messageTextDiv.style.width = '100%';
   messageTextDiv.appendChild(editorMessageContainer);

    if (!editQuill) {
        editQuill = new Quill(editorDiv, {
            modules: {
                syntax: true,
                toolbar: editToolbarOptions
            },
            theme: 'snow'
        });
    }

    const trimmedMessageContent = messageContent.replace(/^\s+|\s+$/g, ''); 
    editQuill.root.innerHTML = trimmedMessageContent;


}

// Save edit message function
function saveEdit(messageId) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const messageContentDiv = messageDiv.querySelector('.message-content');
    const newContentHTML = editQuill.root.innerHTML.trim(); 
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newContentHTML;
    tempDiv.querySelectorAll('select').forEach(select => select.remove());
    const newContent = tempDiv.innerHTML;

    socket.emit('edit_message', { message_id: messageId, content: newContent });

    messageContentDiv.innerHTML = newContent;
    messageContentDiv.style.display = '';
    messageDiv.querySelector('.edit-bar').style.display = ''; 
    messageDiv.querySelector('.editor-message-container').remove(); 
}

// Cancel edit message function
function cancelEdit(messageId) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const editorContainer = messageDiv.querySelector('.editor-message-container');

    if (editorContainer) {
        editorContainer.remove();
    }
    messageDiv.querySelector('.message-content').style.display = '';
    messageDiv.querySelector('.edit-bar').style.display = '';
    editQuill = null;
}