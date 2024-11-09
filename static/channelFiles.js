let mediaFiles = [];
let regularFiles = [];

function getFileIconAndColor(mimeType, filename) {
    // Image files
    if (mimeType.startsWith('image/')) {
        return {
            icon: 'ri-image-fill',
            color: '#4CAF50'
        };  
    }
    // Video files
    if (mimeType.startsWith('video/')) {
        return {
            icon: 'ri-video-fill',
            color: '#F44336'
        };
    }
    // Audio files
    if (mimeType.startsWith('audio/')) {
        return {
            icon: 'ri-music-2-line',
            color: '#7C4DFF'
        };
    }
    // PDF files
    if (mimeType === 'application/pdf') {
        return {
            icon: 'ri-file-pdf-2-fill',
            color: '#FF5722'
        };
    }
    // Word documents
    if (mimeType === 'application/msword' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        return {
            icon: 'ri-file-word-fill',
            color: '#2B579A'
        };
    }
    // Excel files
    if (mimeType === 'application/vnd.ms-excel' || mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return {
            icon: 'ri-file-excel-fill',
            color: '#217346'
        };
    }
    // Text files
    if (filename.endsWith('.txt')) {
        return {
            icon: 'ri-file-text-fill',
            color: '#607D8B'
        };
    }
    // Archive/Zip files
    if (mimeType === 'application/x-zip-compressed' || mimeType === 'application/x-compressed') {
        return {
            icon: 'ri-file-zip-fill',
            color: '#FFA000'
        };
    }
    const codeExtensions = ['.js', '.py', '.java', '.cpp', '.html', '.css', '.php', '.json'];
    if (filename && codeExtensions.some(ext => filename.toLowerCase().endsWith(ext))) {
        return {
            icon: 'ri-code-s-slash-fill',
            color: '#00BCD4'
        };
    }
    // Default
    return {
        icon: 'ri-file-3-fill',
        color: ''
    };
}


function renderFiles(files) {
    channelFileContent.innerHTML = '';
    if (files.length > 0) {
        mediaFiles = files.filter(file =>
            file.file_type.startsWith('image/') ||
            file.file_type.startsWith('video/')
        );
        regularFiles = files.filter(file =>
            !file.file_type.startsWith('image/') &&
            !file.file_type.startsWith('video/')
        );

        const filesSearchBar = document.createElement('div');
        filesSearchBar.className = 'input-group mb-3 sticky-top p-2 justify-content-center';
        filesSearchBar.id = 'files-search-bar';
        filesSearchBar.innerHTML = `
                    <span class="input-group-text" id="search-files"><i class="ri-search-line"></i></span>
                    <input type="search" class="form-control" placeholder="Search files" aria-label="Search files" oninput=searchFiles() aria-describedby="search-files">
                `;
        channelFileContent.appendChild(filesSearchBar);


        if (mediaFiles.length > 0) {
            const mediaHeader = document.createElement('h6');
            mediaHeader.className = 'text-muted';
            mediaHeader.textContent = 'Media Files';
            const mediaGrid = document.createElement('div');
            mediaGrid.className = 'row row-cols-1 row-cols-md-4 g-3 mb-4';
            const initialFiles = mediaFiles.slice(0, 4);

            initialFiles.forEach(file => {
                const col = document.createElement('div');
                col.className = 'col';

                let mediaHTML = '';
                if (file.file_type.startsWith('image/')) {
                    mediaHTML = `
                                <div class="card h-100">
                                    <img src="/static/uploads/${file.filename}" class="card-img-top" alt="${file.filename}" 
                                        style="height: 150px; object-fit: cover;">
                                    <div class="card-body p-2">
                                        <p class="card-text small text-truncate">${file.filename}</p>
                                        <p class="card-text"><small class="text-muted">Shared by <span class="fw-bold">${file.user.username}</span></small></p>
                                    </div>
                                    <div class="card-footer p-2">
                                        <a href="/static/uploads/${file.filename}" class="btn btn-primary btn-sm" download>
                                            <i class="ri-download-2-line"></i>
                                        </a>
                                    </div>
                                </div>`;
                } else if (file.file_type.startsWith('video/')) {
                    mediaHTML = `
                                <div class="card h-100">
                                    <video controls class="card-img-top" style="height: 150px; object-fit: cover;">
                                        <source src="/static/uploads/${file.filename}" type="${file.file_type}">
                                    </video>
                                    <div class="card-body p-2">
                                        <p class="card-text small text-truncate">${file.filename}</p>
                                        <p class="card-text"><small class="text-muted">Shared by  <span class="fw-bold">${file.user.username}</span></small></p>
                                    </div>
                                    <div class="card-footer p-2">
                                        <a href="/static/uploads/${file.filename}" class="btn btn-primary btn-sm" download>
                                            <i class="ri-download-2-line"></i>
                                        </a>
                                    </div>
                                </div>`;
                }

                col.innerHTML = mediaHTML;
                mediaGrid.appendChild(col);
            });

            const modalTemplate = `
                    <div class="modal fade" id="mediaModal" tabindex="-1">
                        <div class="modal-dialog modal-xl">
                            <div class="modal-content">
                                <div class="modal-header">
                                    <h5 class="modal-title">All Media Files</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body">
                                    <div class="row row-cols-1 row-cols-md-4 g-3" id="modalMediaGrid">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;

            document.body.insertAdjacentHTML('beforeend', modalTemplate);

            if (mediaFiles.length > 4) {
                const seeMoreCol = document.createElement('div');
                seeMoreCol.className = 'col-12 text-center mt-3 w-100';
                const seeMoreBtn = document.createElement('button');
                seeMoreBtn.className = 'btn btn-outline-primary';
                seeMoreBtn.innerHTML = `See All Media (${mediaFiles.length})`;
                seeMoreBtn.onclick = () => {
                    const modalMediaGrid = document.getElementById('modalMediaGrid');
                    modalMediaGrid.innerHTML = '';

                    mediaFiles.forEach(file => {
                        const col = document.createElement('div');
                        col.className = 'col';
                        const formattedTimestamp = formatTimestamp(file.created_at, 'MMM DD, YYYY h:mm A');
                        let mediaHTML = '';
                        if (file.file_type.startsWith('image/')) {
                            mediaHTML = `
                                        <div class="card h-100">
                                            <img src="/static/uploads/${file.filename}" class="card-img-top" alt="${file.filename}" 
                                                style="height: 150px; object-fit: cover;">
                                            <div class="card-body p-2">
                                                <p class="card-text small text-truncate">${file.filename}</p>
                                                <p class="card-text"><small class="text-muted">Shared by <span class="fw-bold">${file.user.username}</span> on ${formattedTimestamp}</small></p>
                                            </div>
                                            <div class="card-footer p-2">
                                                <a href="/static/uploads/${file.filename}" class="btn btn-primary btn-sm" download>
                                                    <i class="ri-download-2-line"></i>
                                                </a>
                                            </div>
                                        </div>`;
                        } else if (file.file_type.startsWith('video/')) {
                            mediaHTML = `
                                        <div class="card h-100">
                                            <video controls class="card-img-top" style="height: 150px; object-fit: cover;">
                                                <source src="/static/uploads/${file.filename}" type="${file.file_type}">
                                            </video>
                                            <div class="card-body p-2">
                                                <p class="card-text small text-truncate">${file.filename}</p>
                                                <p class="card-text"><small class="text-muted">Shared by <span class="fw-bold">${file.user.username}</span> on ${formattedTimestamp}</small></p>
                                            </div>
                                            <div class="card-footer p-2">
                                                <a href="/static/uploads/${file.filename}" class="btn btn-primary btn-sm" download>
                                                    <i class="ri-download-2-line"></i>
                                                </a>
                                            </div>
                                        </div>`;
                        }

                        col.innerHTML = mediaHTML;
                        modalMediaGrid.appendChild(col);
                    });

                    const mediaModal = new bootstrap.Modal(document.getElementById('mediaModal'));
                    mediaModal.show();
                };
                seeMoreCol.prepend(seeMoreBtn);
                mediaGrid.appendChild(seeMoreCol);
            }
            channelFileContent.appendChild(mediaHeader);
            channelFileContent.appendChild(mediaGrid);
        }

        if (regularFiles.length > 0) {
            const regularHeader = document.createElement('h6');
            regularHeader.className = 'text-muted';
            regularHeader.textContent = 'Other Files';
            const listGroup = document.createElement('div');
            listGroup.className = 'list-group';

            regularFiles.forEach(file => {
                const fileItem = document.createElement('div');
                const formattedTimestamp = formatTimestamp(file.created_at, 'MMM DD, YYYY h:mm A');
                const { icon, color } = getFileIconAndColor(file.file_type, file.filename);

                fileItem.className = 'list-group-item d-flex justify-content-between align-items-center';
                fileItem.innerHTML = `
                            <div class="d-flex flex-row align-items-center">
                                <i class="${icon} fs-3" style="color: ${color};"></i>
                                <div class="d-flex flex-column ms-2 gap-1">
                                    <p class="mb-0 h6">${file.filename}</p>
                                    <small class="text-muted">Shared by <span class="fw-bold">${file.user.username}</span> on ${formattedTimestamp}</small>
                                </div>
                            </div>
                            <div class="d-flex flex-row align-items-center ms-auto">
                                <a href="/static/uploads/${file.filename}" class="btn btn-primary btn-sm" download>
                                    <i class="ri-download-2-line"></i>
                                </a>
                            </div>
                        `;
                listGroup.appendChild(fileItem);
            });
            channelFileContent.appendChild(regularHeader);
            channelFileContent.appendChild(listGroup);
        }
    } else {
        const noFiles = document.createElement('p');
        noFiles.className = 'text-center text-muted';
        noFiles.textContent = 'No files shared yet';
        channelFileContent.appendChild(noFiles);
    }
}


function searchFiles() {
    const searchInput = document.querySelector('#files-search-bar input');
    const searchTerm = searchInput.value.toLowerCase();

    const existingDropdown = document.querySelector('.search-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
    }

    if (searchTerm === '') return;

    const dropdown = document.createElement('div');
    dropdown.className = 'search-dropdown position-absolute shadow-sm border rounded-bottom mt-5 w-100';
    dropdown.style.backgroundColor = 'var(--bs-body-bg)';
    dropdown.style.maxHeight = '300px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.zIndex = '1000';

    const results = [];

    mediaFiles.forEach(file => {
        if (file.filename.toLowerCase().includes(searchTerm) ||
            file.user.username.toLowerCase().includes(searchTerm)) {
            results.push({
                type: file.file_type.startsWith('image/') ? 'image' : 'video',
                filename: file.filename,
                username: file.user.username,
                created_at: file.created_at,
                file: file
            });
        }
    });

    regularFiles.forEach(file => {
        if (file.filename.toLowerCase().includes(searchTerm) ||
            file.user.username.toLowerCase().includes(searchTerm)) {
            results.push({
                type: 'file',
                filename: file.filename,
                username: file.user.username,
                created_at: file.created_at,
                file: file
            });
        }
    });

    if (results.length > 0) {
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'p-2 hover-bg-light cursor-pointer border-bottom';

            let icon;
            if (result.type === 'image') {
                icon = 'ri-image-line';
            } else if (result.type === 'video') {
                icon = 'ri-video-line';
            } else {
                const { icon: fileIcon } = getFileIconAndColor(result.file.file_type, result.filename);
                icon = fileIcon;
            }

            item.innerHTML = `
                        <div class="d-flex align-items-center gap-2">
                            <i class="${icon}"></i>
                            <div>
                                <div class="text-truncate">${result.filename}</div>
                                <small class="text-muted">Shared by ${result.username}</small>
                            </div>
                        </div>
                    `;

            item.onclick = () => {
                const modal = document.getElementById('filePreviewModal');
                const previewContent = document.getElementById('previewContent');
                const previewFileName = document.getElementById('previewFileName');
                const previewFileInfo = document.getElementById('previewFileInfo');
                const previewDownloadBtn = document.getElementById('previewDownloadBtn');
                const formattedTimestamp = formatTimestamp(result.created_at, 'MMM DD, YYYY h:mm A');

                previewFileName.textContent = result.filename;
                previewFileInfo.innerHTML = `Shared by <span class='fw-bold'>${result.username}</span> on ${formattedTimestamp}`;
                previewDownloadBtn.href = `/static/uploads/${result.filename}`;

                previewContent.innerHTML = '';

                if (result.type === 'image') {
                    previewContent.innerHTML = `
                                <img src="/static/uploads/${result.filename}" class="img-fluid rounded" alt="${result.filename}">
                            `;
                }
                else if (result.type === 'video') {
                    previewContent.innerHTML = `
                                <video controls class="w-100 rounded">
                                    <source src="/static/uploads/${result.filename}" type="${result.file.file_type}">
                                    Your browser does not support the video tag.
                                </video>
                            `;
                }
                else {
                    const { icon, color } = getFileIconAndColor(result.file.file_type, result.filename);
                    previewContent.innerHTML = `
                                <div class="text-center p-5">
                                    <i class="${icon}" style="font-size: 5rem; color: ${color};"></i>
                                    <h4 class="mt-3">${result.filename}</h4>
                                    <p class="text-muted">File preview not available</p>
                                </div>
                            `;
                }

                showModal(filePreviewModal);
                dropdown.remove();
                searchInput.value = '';
                searchInput.parentElement.style.position = '';
            };

            dropdown.appendChild(item);
        });
    } else {
        const noResults = document.createElement('div');
        noResults.className = 'p-2 text-muted';
        noResults.textContent = 'No matching files found';
        dropdown.appendChild(noResults);
    }

    searchInput.parentElement.style.position = 'relative';
    searchInput.parentElement.appendChild(dropdown);

    document.addEventListener('click', (e) => {
        if (!searchInput.parentElement.contains(e.target)) {
            dropdown.remove();
            searchInput.style.position = '';
        }
    });
}