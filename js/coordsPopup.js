const coordsPopupContent = (coordinates) => {
    const origin = window.location.origin;
    const linkToCoordinates = `${origin}/#goto=${coordinates}\n`;

    const popupContent = document.createElement('div');

    const coordSpan = document.createElement('code');
    coordSpan.className = 'popup-coordinates';
    coordSpan.textContent = coordinates;

    const copyIcon = document.createElement('button');
    copyIcon.className = 'popup-copy-button';
    copyIcon.innerHTML = '<svg width="24" height="24" version="1.1" xmlns="http://www.w3.org/2000/svg"><path style="fill:currentColor" d="M17 10v2.018h-1.62c-1.029 0-1.98.509-2.494 1.335-.515.826-.515 1.993 0 2.819.49.783 1.375 1.283 2.35 1.328C14.5 17.432 14 16.858 14 16.172c0-.737.585-1.181 1.38-1.172H17v2l4-3.5ZM5 3S4 3 4 4v11s0 1 1 1h1V5h10V4c0-1-1-1-1-1Zm3 3S7 6 7 7v13c0 1 1 1 1 1h10s1 0 1-1v-2h-2v1H9V8h8v1h2V7c0-1-1-1-1-1Z"/></svg>';

    const copiedText = document.createElement('span');
    copiedText.className = 'popup-copied-msg';
    copiedText.textContent = '✓ Посилання скопійовано!';
    copiedText.style.display = 'none';

    copyIcon.addEventListener('click', () => {
    navigator.clipboard.writeText(linkToCoordinates).then(() => {
        copiedText.style.display = 'inline';
        setTimeout(() => {
            copiedText.style.display = 'none';
        }, 2000);
    }).catch(err => {
        console.error('Could not copy link to clipboard: ', err);
    });
    });

    popupContent.appendChild(coordSpan);
    popupContent.appendChild(copyIcon);
    popupContent.appendChild(copiedText);

	return popupContent;
}

export default coordsPopupContent;