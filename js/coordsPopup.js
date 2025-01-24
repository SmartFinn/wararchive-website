const coordsPopupContent = (coordinates) => {
    const origin = window.location.origin;
    const linkToCoordinates = `${origin}/#goto=${coordinates}\n`;

    const popupContent = document.createElement('div');

    const coordSpan = document.createElement('code');
    coordSpan.className = 'popup-coordinates';
    coordSpan.textContent = coordinates;

    const copyButton = document.createElement('button');
    copyButton.className = 'popup-copy-button';
    copyButton.title = 'Скопіювати посилання на координати';
    copyButton.innerHTML = '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path style="fill:currentColor" d="M9 7c-5 0-5 5-5 5s0 5 5 5h2v-2H9c-3 0-3-3-3-3s0-3 3-3h2V7Zm4 0v2h2c3 0 3 3 3 3s0 3-3 3h-2v2h2c5 0 5-5 5-5s0-5-5-5Zm-4 4v2h6v-2Z"/></svg>';

    const copiedText = document.createElement('span');
    copiedText.className = 'popup-copied-msg';
    copiedText.textContent = '✓ Посилання скопійовано!';
    copiedText.style.display = 'none';

    copyButton.addEventListener('click', () => {
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
    popupContent.appendChild(copyButton);
    popupContent.appendChild(copiedText);

    return popupContent;
}

export default coordsPopupContent;