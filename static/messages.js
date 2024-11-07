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


let loadingOlderMessages = false; 

async function handleScroll() {
    if (channelContent.scrollTop === 0 && !loadingOlderMessages) {
        loadingOlderMessages = true;

        const firstMessageDiv = channelContent.querySelector('.message');
        const oldestMessageId = firstMessageDiv ? firstMessageDiv.dataset.messageId : null;

        const response = await fetch(`/get_messages_for_channel/${conversationType}/${channelId}?last_message_id=${oldestMessageId}&limit=10`);

        if (response.ok) {
            const data = await response.json();
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
}



let fileId = [];

async function uploadFiles(selectedFiles) {
    const formData = new FormData();
    for (const file of selectedFiles) {
        formData.append('files[]', file); 
    }

    try {
        const response = await fetch(`/upload_message_file`, { 
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('File upload failed: ' + response.statusText);
        }

        const result = await response.json();
        fileId = result.file_ids;

    } catch (error) {
        console.error('Error uploading files:', error);
    }
}




document.getElementById('messageForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const messageContentHTML = quill.root.innerHTML.trim();
    const replyContainer = document.querySelector('.reply-container');
    const replyMessageId = replyContainer.dataset.replyMessageId;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = messageContentHTML;
    tempDiv.querySelectorAll('select').forEach(select => select.remove());

    const messageContent = tempDiv.innerHTML;

    if (selectedFiles){
        await uploadFiles(selectedFiles);
    }
    
    const messageData = {
        content: messageContent,    
        conversation_id: currentConversationId, 
        conversation_type: conversationType,   
        channel_id: channelId,
        file_ids: fileId,
    };

    const replyData = {
        content: messageContent,
        conversation_id: currentConversationId,
        conversation_type: conversationType,    
        channel_id: channelId,
        reply_message_id: replyMessageId,
        file_ids: fileId,
    };

    if (isReply) {
        closeReplyContainer();
        socket.emit('send_reply', replyData );
    } else {
        socket.emit('send_message', messageData); 
    }
    
    quill.deleteText(0, quill.getLength())
    submitMessageButton.disabled = true;
    removeAllAttachments();
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


socket.on('message_replied', function(message) {
    if (message.conversation_id === currentConversationId) {
        appendReply(message);
    }
});




function checkScrollPosition() {
    const scrollPosition = channelContent.scrollHeight - channelContent.clientHeight - channelContent.scrollTop;

    const threshold = 100; 

    isUserAtBottom = scrollPosition < threshold;
}


channelContent.addEventListener('scroll', checkScrollPosition);



function renderMessages(messages, prepend = false, isFirstBatch = false, dateDividers = []) {
    messages.forEach(message => {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'position-relative');
        messageDiv.id = `message-${message.id}`;
        messageDiv.dataset.messageId = message.id;

        userReactions[message.id] = userReactions[message.id] || {};

        message.replies.forEach(reaction => {
            if (reaction.type === 'reaction' && reaction.user.user_id === parseInt(currentUserId)) {
                userReactions[message.id][reaction.reaction_type] = {
                    id: reaction.id,
                    reply_id: reaction.reply_id, 
                    reacted: true 
                };
            }
        });


        if (message.is_reply) {
            renderReply = true;
        }

    
        const formattedTimestamp = formatMessageTimestamp(message.timestamp);
        if (renderReply) {
            messageDiv.classList.add('d-flex', 'flex-column');
            if (message.replied_to.content === '<p><br></p>') {
                message.replied_to.content = '<em><i class="ri-attachment-line"></i> Attachment</em>';
            }
            messageDiv.innerHTML = `
                <div class="message-reply d-flex flex-row gap-1 text-muted ms-5" style="font-size: 14px;">
                    <img src="data:image/png;base64,${message.replied_to.user.pfp}" alt="" width="16" height="16" class="rounded-circle mt-2" style="transform: translateY(-5px);">
                    <span class="fw-bold">@${message.replied_to.user.username}</span>
                    <div class="message-replied-content" onclick="window.location.href='#message-${message.replied_to.id}'" style="cursor: pointer;">${message.replied_to.content}</div>
                </div>

                <div class="reply-spline">
                    <div class="reply-spline-horizontal"></div>
                    <div class="reply-spline-vertical"></div>
                </div>

                <div class="replying-message d-flex flex-row">
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
                        <div class="file-attachments d-flex flex-row gap-2 mt-2" style="flex-wrap: wrap;"></div>
                    </div>
                    <div class="reactions d-flex gap-2 mt-2" id="reactions-${message.id}"></div>
                </div>
                </div>
                <div class="edit-bar btn-group position-absolute border" role="group" style="visibility: hidden;">
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '👍')" data-bs-toggle="tooltip" data-bs-title="Thumbs Up">👍</button>
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '❤️')" data-bs-toggle="tooltip" data-bs-title="Like">❤️</button>
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '😂')" data-bs-toggle="tooltip" data-bs-title="Laugh">😂</button>
                    <button type="button" class="btn btn-sm" onclick="openEmojiSelector(${message.id}, this)" data-bs-toggle="tooltip" data-bs-title="More Reactions"><i class="ri-emoji-sticker-line"></i></button>

                    <div class="vr mx-1"></div>

                    <button type="button" class="btn btn-sm" onclick="replyToMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Reply"><i class="ri-reply-line"></i></button>
                    <button type="button" class="btn btn-sm" onclick="editMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Edit Message"><i class="ri-edit-line"></i></button>
                    <button type="button" class="btn btn-sm" onclick="deleteReply(${message.id})" data-bs-toggle="tooltip" data-bs-title="Delete Message"><i class="ri-delete-bin-6-line text-danger"></i></button>
                </div>

                <div class="d-flex justify-content-end w-100 mt-4 mb-4" id="emoji-picker-container-${message.id}" style="position: absolute; z-index: 1000; display: none; transform: translateX(-20px); "></div>
            `;

        } else {
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
                        <div class="file-attachments d-flex flex-row gap-2 mt-2" style="flex-wrap: wrap;"></div>
                    </div>
                    <div class="reactions d-flex gap-2 mt-2" id="reactions-${message.id}"></div>
                </div>
                <div class="edit-bar btn-group position-absolute border" role="group" style="visibility: hidden;">
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '👍')" data-bs-toggle="tooltip" data-bs-title="Thumbs Up">👍</button>
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '❤️')" data-bs-toggle="tooltip" data-bs-title="Like">❤️</button>
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '😂')" data-bs-toggle="tooltip" data-bs-title="Laugh">😂</button>
                    <button type="button" class="btn btn-sm" onclick="openEmojiSelector(${message.id}, this)" data-bs-toggle="tooltip" data-bs-title="More Reactions"><i class="ri-emoji-sticker-line"></i></button>

                    <div class="vr mx-1"></div>

                    <button type="button" class="btn btn-sm" onclick="replyToMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Reply"><i class="ri-reply-line"></i></button>
                    <button type="button" class="btn btn-sm" onclick="editMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Edit Message"><i class="ri-edit-line"></i></button>
                    <button type="button" class="btn btn-sm" onclick="deleteMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Delete Message"><i class="ri-delete-bin-6-line text-danger"></i></button>
                </div>

                <div class="d-flex justify-content-end w-100 mt-4 mb-4" id="emoji-picker-container-${message.id}" style="position: absolute; z-index: 1000; display: none; transform: translateX(-20px); "></div>
            `;
        }

        if (message.replies.length > 0) {
            const reactionsContainer = messageDiv.querySelector(`#reactions-${message.id}`);
            const renderedReactions = new Map();  
        
            message.replies.forEach(reaction => {
                if (reaction.type === 'reaction' && !renderedReactions.has(reaction.reaction_type)) {
                    const reactionCount = message.replies.filter(reply => reply.reaction_type === reaction.reaction_type).length;
        
                    const reactionSpan = document.createElement('span');
                    reactionSpan.classList.add('reaction', 'text-muted');
                    reactionSpan.textContent = `${reaction.reaction_type} ${reactionCount} `;
                    
        
                    if (message.replies.some(reply => reply.reaction_type === reaction.reaction_type && reply.user.user_id === parseInt(currentUserId))) {
                        reactionSpan.style.borderColor = 'var(--secondary-color)';
                    }
        
                    renderedReactions.set(reaction.reaction_type, { span: reactionSpan, count: reactionCount });
        
                    reactionSpan.onclick = function() {
                        const userReaction = message.replies.find(reply => 
                            reply.reaction_type === reaction.reaction_type && reply.user.user_id === parseInt(currentUserId)
                        );
                        
        
                        if (userReaction) {
                            const reactionData = renderedReactions.get(reaction.reaction_type);
                            reactionData.count--;
                            

                            if (reactionData.count > 0) {
                                reactionData.span.textContent = `${reaction.reaction_type} ${reactionData.count} `;
                                reactionData.span.style.borderColor = '';
                            } else {
                                reactionData.span.remove();
                                console.log('removed render')
                                renderedReactions.delete(reaction.reaction_type);
                            }
                            socket.emit('reaction_deleted', {message_id: message.id, reaction_message_id: userReaction.reply_id, reply_id: userReaction.id, conversation_id: currentConversationId});
                        } else {
                            reactToMessage(message.id, reaction.reaction_type);
                        }
                    };
                    reactionsContainer.appendChild(reactionSpan);
                }
            });
        }
        

        if (message.file_attachments.length > 0) {
            message.file_attachments.forEach(file => {
                if (file.file_type.startsWith('image/')) {
                    const imageAttachment = document.createElement('img');
                    imageAttachment.src = `/static/uploads/${file.filename}`;
                    imageAttachment.alt = file.filename;
                    imageAttachment.classList.add('rounded', 'border', 'border-1', 'border-secondary');
                    imageAttachment.style.maxHeight = '250px';
                    imageAttachment.style.maxWidth = '250px';
                    imageAttachment.style.objectFit = 'cover';
                    messageDiv.querySelector('.file-attachments').appendChild(imageAttachment);

                } else if (file.file_type.startsWith('video/')) {
                    const videoAttachment = document.createElement('video');
                    videoAttachment.src = `/static/uploads/${file.filename}`;
                    videoAttachment.alt = file.filename;
                    videoAttachment.classList.add('rounded', 'border', 'border-1', 'border-secondary');
                    videoAttachment.style.maxWidth = "250px";
                    videoAttachment.style.maxHeight = "250px";
                    videoAttachment.style.objectFit = "cover";
                    videoAttachment.controls = true;  
                    messageDiv.querySelector('.file-attachments').appendChild(videoAttachment);
                } else {
                    const fileAttachment = document.createElement("div");
                    const fileDownloadLink = document.createElement("a");
                    fileAttachment.className = "file-preview d-flex flex-column align-items-center justify-content-center p-2 border rounded";
                    fileAttachment.style.backgroundColor = "var(--bs-body-bg)";
                    fileAttachment.style.width = "250px";

                    fileDownloadLink.style.width = "230px";
                    fileDownloadLink.style.overflow = "hidden";
                    fileDownloadLink.style.textOverflow = "ellipsis";
                    fileDownloadLink.style.whiteSpace = "nowrap";
                    fileDownloadLink.textContent = file.filename;
                    fileDownloadLink.href = `/static/uploads/${file.filename}`;
                    fileDownloadLink.target = "_blank"; 
                    fileDownloadLink.classList.add('text-decoration-none', 'text-center');
                    fileDownloadLink.title = file.filename;
                    fileDownloadLink.setAttribute("data-bs-toggle", "tooltip");
                    const tooltip = new bootstrap.Tooltip(fileDownloadLink); 


                    let iconClass;
                    const fileExtension = file.filename.split('.').pop().toLowerCase();
            
                    switch (fileExtension) {
                        case 'pdf':
                            iconClass = 'ri-file-pdf-2-line'; 
                            break;
                        case 'zip':
                        case 'rar':
                        case '7z':
                            iconClass = 'ri-file-zip-line'; 
                            break;
                        case 'doc':
                        case 'docx':
                            iconClass = 'ri-file-word-line'; 
                            break;
                        case 'xls':
                        case 'xlsx':
                            iconClass = 'ri-file-excel-line';
                            break;
                        case 'ppt':
                        case 'pptx':
                            iconClass = 'ri-file-ppt-line'; 
                            break;
                        default:
                            iconClass = 'ri-file-line'; 
                            break;
                    }
            
                    const icon = document.createElement("i");
                    icon.className = `${iconClass} display-3 me-2`;                             
                    messageDiv.querySelector('.file-attachments').appendChild(fileAttachment);
                    fileAttachment.appendChild(fileDownloadLink);
                    fileAttachment.appendChild(icon);
                    
                }
                    
            });
        }
        

        messageDiv.addEventListener('mouseenter', () => {
            messageDiv.querySelector('.edit-bar').style.visibility = 'visible';
        });

        messageDiv.addEventListener('mouseleave', () => {
            messageDiv.querySelector('.edit-bar').style.visibility = 'hidden';
        });

        if (prepend) {
            channelContent.prepend(messageDiv);
        } 

        renderReply = false;
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

}






function appendMessage(message) {
    const newMessage = document.createElement('div');
    const formattedTimestamp = formatMessageTimestamp(message.timestamp);
    const messageDate = new Date(message.timestamp).toDateString(); 
    const messageDatetoFormat = new Date(message.timestamp)
    const formattedDate = messageDatetoFormat.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}); 
    console.log('appenend',message)

    newMessage.innerHTML = `
        <div class="message position-relative" id="message-${message.id}" data-message-id=${message.id}>
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
                    <div class="file-attachments d-flex flex-row gap-2 mt-2" style="flex-wrap: wrap;"></div>
                </div>
                <div class="reactions d-flex gap-2 mt-2" id="reactions-${message.id}"></div>
            </div>
            <div class="edit-bar btn-group position-absolute border" role="group" style="visibility: hidden;">
                <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '👍')" data-bs-toggle="tooltip" data-bs-title="Thumbs Up">👍</button>
                <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '❤️')" data-bs-toggle="tooltip" data-bs-title="Like">❤️</button>
                <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '😂')" data-bs-toggle="tooltip" data-bs-title="Laugh">😂</button>
                <button type="button" class="btn btn-sm" onclick="openEmojiSelector(${message.id}, this)" data-bs-toggle="tooltip" data-bs-title="More Reactions"><i class="ri-emoji-sticker-line"></i></button>

                <div class="vr mx-1"></div>

                <button type="button" class="btn btn-sm" onclick="replyToMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Reply"><i class="ri-reply-line"></i></button>
                <button type="button" class="btn btn-sm" onclick="editMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Edit Message"><i class="ri-edit-line"></i></button>
                <button type="button" class="btn btn-sm" onclick="deleteMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Delete Message"><i class="ri-delete-bin-6-line text-danger"></i></button>
            </div>

            <div class="d-flex justify-content-end w-100 mt-4 mb-4" id="emoji-picker-container-${message.id}" style="position: absolute; z-index: 1000; display: none; transform: translateX(-20px); "></div>
    `;

    const previousMessage = channelContent.lastElementChild;

    if (!previousMessage.classList.contains('channel-start-message')) {
        const previousTimestamp = previousMessage.querySelector('.message-timestamp span').dataset.timestamp;
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

    if (message.file_attachments.length > 0) {
        message.file_attachments.forEach(file => {
            if (file.file_type.startsWith('image/')) {
                const imageAttachment = document.createElement('img');
                imageAttachment.src = `/static/uploads/${file.filename}`;
                imageAttachment.alt = file.filename;
                imageAttachment.classList.add('rounded', 'border', 'border-1', 'border-secondary');
                imageAttachment.style.maxHeight = '250px';
                imageAttachment.style.maxWidth = '250px';
                imageAttachment.style.objectFit = 'cover';
                newMessage.querySelector('.file-attachments').appendChild(imageAttachment);

            } else if (file.file_type.startsWith('video/')) {
                const videoAttachment = document.createElement('video');
                videoAttachment.src = `/static/uploads/${file.filename}`;
                videoAttachment.alt = file.filename;
                videoAttachment.classList.add('rounded', 'border', 'border-1', 'border-secondary');
                videoAttachment.style.maxWidth = "250px";
                videoAttachment.style.maxHeight = "250px";
                videoAttachment.style.objectFit = "cover";
                videoAttachment.controls = true;  
                newMessage.querySelector('.file-attachments').appendChild(videoAttachment);
            } else {
                const fileAttachment = document.createElement("div");
                const fileDownloadLink = document.createElement("a");
                fileAttachment.className = "file-preview d-flex flex-column align-items-center justify-content-center p-2 border rounded";
                fileAttachment.style.backgroundColor = "var(--bs-body-bg)";
                fileAttachment.style.width = "250px";

                fileDownloadLink.style.width = "230px";
                fileDownloadLink.style.overflow = "hidden";
                fileDownloadLink.style.textOverflow = "ellipsis";
                fileDownloadLink.style.whiteSpace = "nowrap";
                fileDownloadLink.textContent = file.filename;
                fileDownloadLink.href = `/static/uploads/${file.filename}`;
                fileDownloadLink.target = "_blank"; 
                fileDownloadLink.classList.add('text-decoration-none', 'text-center');
                fileDownloadLink.title = file.filename;
                fileDownloadLink.setAttribute("data-bs-toggle", "tooltip");
                const tooltip = new bootstrap.Tooltip(fileDownloadLink); 

                let iconClass;
                const fileExtension = file.filename.split('.').pop().toLowerCase();
        
                switch (fileExtension) {
                    case 'pdf':
                        iconClass = 'ri-file-pdf-2-line'; 
                        break;
                    case 'zip':
                    case 'rar':
                    case '7z':
                        iconClass = 'ri-file-zip-line'; 
                        break;
                    case 'doc':
                    case 'docx':
                        iconClass = 'ri-file-word-line'; 
                        break;
                    case 'xls':
                    case 'xlsx':
                        iconClass = 'ri-file-excel-line';
                        break;
                    case 'ppt':
                    case 'pptx':
                        iconClass = 'ri-file-ppt-line'; 
                        break;
                    default:
                        iconClass = 'ri-file-line'; 
                        break;
                }
        
                const icon = document.createElement("i");
                icon.className = `${iconClass} display-3 me-2`; 
                
                newMessage.querySelector('.file-attachments').appendChild(fileAttachment);
                fileAttachment.appendChild(fileDownloadLink);
                fileAttachment.appendChild(icon);
                
            }
                
        });
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


function appendReply(message) {
    const newMessage = document.createElement('div');
    const formattedTimestamp = formatMessageTimestamp(message.timestamp);
    const messageDate = new Date(message.timestamp).toDateString(); 
    const messageDatetoFormat = new Date(message.timestamp)
    const formattedDate = messageDatetoFormat.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'}); 

    if (message.replied_to.content === '<p><br></p>') {
        message.replied_to.content = '<em><i class="ri-attachment-line"></i> Attachment</em>';
    }

    newMessage.innerHTML = `
        <div class="message position-relative d-flex flex-column" id="message-${message.id}" data-message-id=${message.id}>
            <div class="message-reply d-flex flex-row gap-1 text-muted ms-5" style="font-size: 14px;">
                    <img src="data:image/png;base64,${message.replied_to.user.pfp}" alt="" width="16" height="16" class="rounded-circle mt-2" style="transform: translateY(-5px);">
                    <span class="fw-bold">@${message.replied_to.user.username}</span>
                    <div>${message.replied_to.content}</div>
                </div>

                <div class="reply-spline">
                    <div class="reply-spline-horizontal"></div>
                    <div class="reply-spline-vertical"></div>
                </div>

                <div class="replying-message d-flex flex-row">
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
                        <div class="file-attachments d-flex flex-row gap-2 mt-2" style="flex-wrap: wrap;"></div>
                    </div>
                    <div class="reactions d-flex gap-2 mt-2" id="reactions-${message.id}"></div>
                </div>
                </div>
                <div class="edit-bar btn-group position-absolute border" role="group" style="visibility: hidden;">
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '👍')" data-bs-toggle="tooltip" data-bs-title="Thumbs Up">👍</button>
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '❤️')" data-bs-toggle="tooltip" data-bs-title="Like">❤️</button>
                    <button type="button" class="btn btn-sm" onclick="reactToMessage(${message.id}, '😂')" data-bs-toggle="tooltip" data-bs-title="Laugh">😂</button>
                    <button type="button" class="btn btn-sm" onclick="openEmojiSelector(${message.id}, this)" data-bs-toggle="tooltip" data-bs-title="More Reactions"><i class="ri-emoji-sticker-line"></i></button>

                    <div class="vr mx-1"></div>

                    <button type="button" class="btn btn-sm" onclick="replyToMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Reply"><i class="ri-reply-line"></i></button>
                    <button type="button" class="btn btn-sm" onclick="editMessage(${message.id})" data-bs-toggle="tooltip" data-bs-title="Edit Message"><i class="ri-edit-line"></i></button>
                    <button type="button" class="btn btn-sm" onclick="deleteReply(${message.id})" data-bs-toggle="tooltip" data-bs-title="Delete Message"><i class="ri-delete-bin-6-line text-danger"></i></button>
                </div>

                <div class="d-flex justify-content-end w-100 mt-4 mb-4" id="emoji-picker-container-${message.id}" style="position: absolute; z-index: 1000; display: none; transform: translateX(-20px); "></div>
    `;

    const previousMessage = channelContent.lastElementChild;
    if (previousMessage) {
        const previousTimestamp = previousMessage.querySelector('.message-timestamp span').dataset.timestamp;
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

    if (message.file_attachments.length > 0) {
        message.file_attachments.forEach(file => {
            if (file.file_type.startsWith('image/')) {
                const imageAttachment = document.createElement('img');
                imageAttachment.src = `/static/uploads/${file.filename}`;
                imageAttachment.alt = file.filename;
                imageAttachment.classList.add('rounded', 'border', 'border-1', 'border-secondary');
                imageAttachment.style.maxHeight = '250px';
                imageAttachment.style.maxWidth = '250px';
                imageAttachment.style.objectFit = 'cover';
                newMessage.querySelector('.file-attachments').appendChild(imageAttachment);

            } else if (file.file_type.startsWith('video/')) {
                const videoAttachment = document.createElement('video');
                videoAttachment.src = `/static/uploads/${file.filename}`;
                videoAttachment.alt = file.filename;
                videoAttachment.classList.add('rounded', 'border', 'border-1', 'border-secondary');
                videoAttachment.style.maxWidth = "250px";
                videoAttachment.style.maxHeight = "250px";
                videoAttachment.style.objectFit = "cover";
                videoAttachment.controls = true;  
                newMessage.querySelector('.file-attachments').appendChild(videoAttachment);
            } else {
                const fileAttachment = document.createElement("div");
                const fileDownloadLink = document.createElement("a");
                fileAttachment.className = "file-preview d-flex flex-column align-items-center justify-content-center p-2 border rounded";
                fileAttachment.style.backgroundColor = "var(--bs-body-bg)";
                fileAttachment.style.width = "250px";

                fileDownloadLink.style.width = "230px";
                fileDownloadLink.style.overflow = "hidden";
                fileDownloadLink.style.textOverflow = "ellipsis";
                fileDownloadLink.style.whiteSpace = "nowrap";
                fileDownloadLink.textContent = file.filename;
                fileDownloadLink.href = `/static/uploads/${file.filename}`;
                fileDownloadLink.target = "_blank"; 
                fileDownloadLink.classList.add('text-decoration-none', 'text-center');
                fileDownloadLink.title = file.filename;
                fileDownloadLink.setAttribute("data-bs-toggle", "tooltip");
                const tooltip = new bootstrap.Tooltip(fileDownloadLink); 

                let iconClass;
                const fileExtension = file.filename.split('.').pop().toLowerCase();
        
                switch (fileExtension) {
                    case 'pdf':
                        iconClass = 'ri-file-pdf-2-line'; 
                        break;
                    case 'zip':
                    case 'rar':
                    case '7z':
                        iconClass = 'ri-file-zip-line'; 
                        break;
                    case 'doc':
                    case 'docx':
                        iconClass = 'ri-file-word-line'; 
                        break;
                    case 'xls':
                    case 'xlsx':
                        iconClass = 'ri-file-excel-line';
                        break;
                    case 'ppt':
                    case 'pptx':
                        iconClass = 'ri-file-ppt-line'; 
                        break;
                    default:
                        iconClass = 'ri-file-line'; 
                        break;
                }
        
                const icon = document.createElement("i");
                icon.className = `${iconClass} display-3 me-2`; 
                
                newMessage.querySelector('.file-attachments').appendChild(fileAttachment);
                fileAttachment.appendChild(fileDownloadLink);
                fileAttachment.appendChild(icon);
                
            }
                
        });
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


function deleteReply(messageId) {
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
        socket.emit('delete_reply', { message_id: messageId, conversation_id: currentConversationId });
        deleteMessageModal.hide();
    };
}



let editQuill;
let activeEditorMessageId = null; 

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

function editMessage(messageId) {

    if (activeEditorMessageId && activeEditorMessageId !== messageId) {
        cancelEdit(activeEditorMessageId);
    }

    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const messageContentDiv = messageDiv.querySelector('.message-content');
    const messageTextDiv = messageDiv.querySelector('.message-text');
    const messageContent = messageContentDiv.innerHTML;

    messageContentDiv.style.display = 'none';
    messageDiv.querySelector('.edit-bar').style.display = 'none';
    messageDiv.style.backgroundColor = '#68572f';

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
    activeEditorMessageId = messageId;


}



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
    messageDiv.style.backgroundColor = '';
    messageDiv.querySelector('.editor-message-container').remove(); 
}

function cancelEdit(messageId) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const editorContainer = messageDiv.querySelector('.editor-message-container');

    if (editorContainer) {
        editorContainer.remove();
    }
    messageDiv.querySelector('.message-content').style.display = '';
    messageDiv.querySelector('.edit-bar').style.display = '';
    messageDiv.style.backgroundColor = '';
    editQuill = null;
    activeEditorMessageId = null;
}

let emojiPickerContainer = null;
let emojiPicker = null;
let emojiPickerOpen = false; 
let outsideClickHandler = null; 

function openEmojiSelector(messageId, buttonElement) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const allMessageDiv = document.querySelectorAll('.message');

    allMessageDiv.forEach(div => {
        if (div !== messageDiv) {
            div.style.backgroundColor = '';
        }
    });

    if (emojiPickerOpen) {
        emojiPickerContainer.style.display = 'none';
        if (emojiPicker) {
            emojiPickerContainer.removeChild(emojiPicker);
        }
        emojiPickerOpen = false; 

        if (outsideClickHandler) {
            document.removeEventListener('click', outsideClickHandler);
            outsideClickHandler = null;
        }
    }

    emojiPickerContainer = document.getElementById(`emoji-picker-container-${messageId}`);
    emojiPicker = emojiPickerContainer.querySelector('emoji-picker');

    if (!emojiPicker) {
        emojiPicker = document.createElement('emoji-picker');
        emojiPickerContainer.appendChild(emojiPicker);

        emojiPicker.addEventListener('emoji-click', (event) => {
            reactToMessage(messageId, event.detail.unicode);
            emojiPickerContainer.style.display = 'none';
            emojiPickerContainer.removeChild(emojiPicker);
            messageDiv.style.backgroundColor = '';
            emojiPickerOpen = false; 
            document.removeEventListener('click', outsideClickHandler);
        });
    }

    emojiPickerContainer.style.display = emojiPickerContainer.style.display === 'block' ? 'none' : 'block';
    emojiPickerOpen = emojiPickerContainer.style.display === 'block'; 

    messageDiv.style.backgroundColor = 'var(--search-bar-color)';

    if (emojiPickerOpen) {
        outsideClickHandler = (e) => handleOutsideClick(e, buttonElement, emojiPickerContainer, emojiPicker, messageDiv);
        document.addEventListener('click', outsideClickHandler);
    }
}

function handleOutsideClick(e, buttonElement, emojiPickerContainer, emojiPicker, messageDiv) {
    const buttonIcon = buttonElement.querySelector('i');
    if (emojiPickerContainer && e.target !== emojiPicker && e.target !== buttonElement && e.target !== buttonIcon) {
        emojiPickerContainer.style.display = 'none';
        emojiPickerContainer.removeChild(emojiPicker);
        messageDiv.style.backgroundColor = '';
        emojiPicker = null;
        emojiPickerContainer = null;
        emojiPickerOpen = false; 

        if (outsideClickHandler) {
            document.removeEventListener('click', outsideClickHandler);
            outsideClickHandler = null;
        }
    } else {
        console.log('clicked inside');
    }
}



function reactToMessage(messageId, emojiUnicode) {
    const messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    const messageReactions = document.querySelector(`#reactions-${messageId}`);
    const alreadyReacted = userReactions[messageId]?.[emojiUnicode]?.reacted === true;

    if (alreadyReacted) {
        const reactionMessageId = userReactions[messageId]?.[emojiUnicode].reply_id;
        const replyId = userReactions[messageId]?.[emojiUnicode].id;
        const reactionSpans = messageReactions.querySelectorAll('.reaction');

        socket.emit('reaction_deleted', {message_id: messageId, reaction_message_id: reactionMessageId, reply_id: replyId, conversation_id: currentConversationId});
    } else {
        socket.emit('react_to_message', {message_id: messageId, content: emojiUnicode, conversation_id: currentConversationId});
        const reactionSpans = messageReactions.querySelectorAll('.reaction');
        let reactionFound = false;

        reactionSpans.forEach(span => {
            const [reactionType, count] = span.textContent.split(' ');
            if (reactionType === emojiUnicode) {
                const newCount = parseInt(count) + 1;
                span.textContent = `${reactionType} ${newCount}`;
                span.style.borderColor = 'var(--secondary-color)';
                reactionFound = true;
            }
        });

        if (!reactionFound) {
            const newReactionSpan = document.createElement('span');
            newReactionSpan.classList.add('reaction', 'text-muted');
            newReactionSpan.textContent = `${emojiUnicode} 1`;
            newReactionSpan.style.borderColor = 'var(--secondary-color)';
            messageReactions.appendChild(newReactionSpan);
            newReactionSpan.onclick = function() {
                reactToMessage(messageId, emojiUnicode);
            };
        }
    }
}

socket.on('message_reacted', (data) => {
    const { message_id, reaction_type, id, reply_id, sender_id } = data;

    const messageReactions = document.querySelector(`#reactions-${message_id}`);
    const reactionSpans = messageReactions.querySelectorAll('.reaction');
    let reactionFound = false;

    reactionSpans.forEach(span => {
        const [reactionType, count] = span.textContent.split(' ');
        if (reactionType === reaction_type) {
            const newCount = parseInt(count) + 1;
            span.textContent = `${reactionType} ${newCount}`;
            span.style.borderColor = 'var(--secondary-color)';
            reactionFound = true;
        }
    });

    if (!reactionFound) {
        const newReactionSpan = document.createElement('span');
        newReactionSpan.classList.add('reaction', 'text-muted');
        newReactionSpan.textContent = `${reaction_type} 1`;
        newReactionSpan.style.borderColor = 'var(--secondary-color)';
        messageReactions.appendChild(newReactionSpan);
    }
}
);

socket.on('user_reaction_update', (data) => {
    const { message_id, reaction_type, id, reply_id, sender_id } = data;

    if (sender_id === parseInt(currentUserId)) {
        userReactions[message_id] = userReactions[message_id] || {};

        userReactions[message_id][reaction_type] = {
            id: id,
            reply_id: reply_id,
            reacted: true
        };

        console.log(userReactions);
    }
});

socket.on('message_reaction_deleted', (data) => {
    const { message_id, reaction_type, id, reply_id, sender_id } = data;

    const messageReactions = document.querySelector(`#reactions-${message_id}`);
    const reactionSpans = messageReactions.querySelectorAll('.reaction');

    reactionSpans.forEach(span => {
        const [reactionType, count] = span.textContent.split(' ');
        if (reactionType === reaction_type) {
            const newCount = parseInt(count) - 1;
            if (newCount > 0) {
                span.textContent = `${reactionType} ${newCount}`;
                if (sender_id === parseInt(currentUserId)) {
                    span.style.borderColor = '';
                };
            } else {
                span.remove();
            }
        }
    });

    if (sender_id === parseInt(currentUserId)) {
        userReactions[message_id][reaction_type].reacted = false;
    }
});


async function replyToMessage(messageId) {
    isReply = true;
    messageDiv = document.querySelector(`.message[data-message-id="${messageId}"]`);
    messageContainer = document.querySelector('.message-container');
    replyContainer = messageContainer.querySelector('.reply-container');
    replyHeader = replyContainer.querySelector('.reply-header');
    replyContent = replyContainer.querySelector('.reply-content');
    replyTitle = replyContainer.querySelector('#reply-title');

    replyTitle.textContent = '';
    replyContent.innerHTML = '';


    const response = await fetch(`/get_message_data/${messageId}`);
    
    if (response.ok){
        data = await response.json();
        messageContent = data.content;
    }
    
    replyContainer.dataset.replyMessageId = messageId;
    replyContainer.style.display = 'block';
    replyTitleContent = `Replying to <span class='fw-bold'>${data.user.username}</span>`;
    replyTitle.innerHTML = replyTitleContent;

    if (messageContent == '<p><br></p>') {
        replyContent.innerHTML = '<em><i class="ri-attachment-line"></i> Attachment</em>';

    } else {
        replyContent.innerHTML = messageContent;
    }

}

function closeReplyContainer() {
    isReply = false;
    replyContainer = document.querySelector('.reply-container');
    replyContainer.style.display = 'none';
}


function handleFileSelect(event) {
    const MAX_FILE_SIZE = 250 * 1024 * 1024;
    const file = event.target.files[0];

    if (file) {
        if (file.size > MAX_FILE_SIZE) {
            alert("File exceeds the maximum size of 250 MB.");
            return;
        } else if (selectedFiles.length >= 5) {
            alert("You can only attach up to 5 files per message.");
            return;
        } else {
            selectedFiles.push(file);
            const index = selectedFiles.length - 1;
            displayFilePreview(file, index); 
            event.target.value = '';
        }
    }
}

function displayFilePreview(file, index) {
    const fileAttachmentContainer = document.getElementById('file-attachment-container');
    const filePreviewContainer = document.createElement("div");
    filePreviewContainer.className = "file-preview d-flex flex-column align-items-center mt-2 p-2 ms-2 border rounded";
    filePreviewContainer.style.backgroundColor = "var(--bs-body-bg)";
    filePreviewContainer.style.width = "230px";
    filePreviewContainer.setAttribute("data-index", index);

    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.alt = file.name;
        img.style.maxWidth = "200px";
        img.style.maxHeight = "120px";
        img.style.objectFit = "cover";
        img.className = "rounded img-fluid";
        filePreviewContainer.appendChild(img);

    } else if (file.type.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(file);
        video.alt = file.name;
        video.style.maxWidth = "200px";
        video.style.maxHeight = "120px";
        video.style.objectFit = "cover";
        video.className = "rounded img-fluid";
        video.controls = true;  
        filePreviewContainer.appendChild(video);

    } else {
        let iconClass;
        const fileExtension = file.name.split('.').pop().toLowerCase();

        switch (fileExtension) {
            case 'pdf':
                iconClass = 'ri-file-pdf-2-line'; 
                break;
            case 'zip':
            case 'rar':
            case '7z':
                iconClass = 'ri-file-zip-line'; 
                break;
            case 'doc':
            case 'docx':
                iconClass = 'ri-file-word-line'; 
                break;
            case 'xls':
            case 'xlsx':
                iconClass = 'ri-file-excel-line';
                break;
            case 'ppt':
            case 'pptx':
                iconClass = 'ri-file-ppt-line'; 
                break;
            default:
                iconClass = 'ri-file-line'; 
                break;
        }

        const icon = document.createElement("i");
        icon.className = `${iconClass} display-3 me-2`; 
        filePreviewContainer.appendChild(icon);
    }

    const truncatedName = file.name.length > 30 ? file.name.slice(0, 30) + "..." : file.name;
    const fileName = document.createElement("span");
    fileName.textContent = truncatedName;
    fileName.classList.add("mt-1");
    fileName.style.flexGrow = "1";
    fileName.style.fontSize = '14px';
    filePreviewContainer.appendChild(fileName);

    const fileHeader = document.createElement("div");
    fileHeader.classList.add("d-flex", "w-100", "justify-content-end");
    const closeIcon = document.createElement("i");
    closeIcon.className = "ri-close-line ms-2";
    closeIcon.style.cursor = "pointer";
    closeIcon.onclick = () => removeFile(index, filePreviewContainer);
    filePreviewContainer.prepend(fileHeader);
    fileHeader.appendChild(closeIcon);

    fileAttachmentContainer.appendChild(filePreviewContainer);
    submitMessageButton.disabled = false; 
}




function removeFile(index, previewContainer) {
    if (index >= 0 && index < selectedFiles.length) {
        selectedFiles.splice(index, 1); 

        if (previewContainer) {
            previewContainer.remove();
        }
        
        document.querySelectorAll('.file-preview').forEach((preview, idx) => {
            preview.setAttribute('data-index', idx);  
        });

        if (selectedFiles.length === 0) {
            submitMessageButton.disabled = true; 
        }
    }
}


function removeAllAttachments() {
    selectedFiles = [];
    document.getElementById('file-attachment-container').innerHTML = '';
    submitMessageButton.disabled = true; 
}