browser.browserAction.onClicked.addListener(() => {
    browser.sidebarAction.open();
    document.documentElement.setAttribute('data-theme', 'light');
  });
  