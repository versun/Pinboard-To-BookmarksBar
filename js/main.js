const BASE_URL = 'https://pinboard.in';
let username = '';
let allBundles = [];
let selectedBundles = [];
let allBookmarks = {}; //{"bundleName":{"tagName":{"title":"url"}}}

const showMessage = (message, id) => {
  toggleModal("dialog", "true");
  document.querySelector(id).innerHTML = "";
  document.querySelector(id).innerHTML = message;
}
//show bookmarks on the page
const showBookmark = () => {
  //console.log('updateBookmarksPage');
  let showBookmarkElement = document.getElementById('bookmark');
  showBookmarkElement.innerHTML = "";

  for (const bundleName in allBookmarks) {
    const bundle = allBookmarks[bundleName];
    const bundleLi = document.createElement('li');
    const bundleA = document.createElement('span');
    bundleA.textContent = bundleName;
    bundleLi.appendChild(bundleA);
    const bundleUl = document.createElement('ul');
    bundleLi.appendChild(bundleUl);

    for (const tagName in bundle) {
      const tag = bundle[tagName];
      const tagLi = document.createElement('li');
      const tagA = document.createElement('span');
      tagA.textContent = tagName;
      tagLi.appendChild(tagA);
      const tagUl = document.createElement('ul');
      tagLi.appendChild(tagUl);

      for (const bookmark of tag) {
        const bookmarkLi = document.createElement('li');
        const bookmarkA = document.createElement('a');
        bookmarkA.classList.add('bookmark');
        bookmarkA.textContent = bookmark.title;
        bookmarkA.setAttribute('href', bookmark.url);
        bookmarkA.setAttribute('target', '_blank');
        bookmarkLi.appendChild(bookmarkA);
        tagUl.appendChild(bookmarkLi);
      }
      bundleUl.appendChild(tagLi);
    }
    showBookmarkElement.appendChild(bundleLi);
  }
  showBookmarkElement.setAttribute("aria-busy", "false");
  //console.log('updateBookmarksPage done');
}
const checkResults = (results) => {
  //console.log('checkResults');
  if (!results) {
    console.error('No results');
    return 'No results';
  }
  if (!Array.isArray(results)) {
    console.error('Results is not an array');
    return 'Results is not an array';
  }
  if (results.length === 0) {
    console.error('Results is empty, maybe you are not logged in?');
    return 'Results is empty, maybe you are not logged in?';
  }
  //console.log('checkResults done');
  return 'Done';
}
//show all bundles on the id=boomarks with a checkbox
const showBundles = (bundles) => {
  //console.log('showBundles');
  let html = '';
  document.getElementById("get_bundles").setAttribute("aria-busy", "false");
  document.querySelector('#bundles').innerHTML = html;
  bundles.forEach(bundle => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(bundle.pageCode, 'text/html');
    let bookmarkCount = 0;
    if (doc.title != '') {
      bookmarkCount = doc.querySelector('span.bookmark_count').textContent;
    }
    html += `<label><input type="checkbox" name="bundle" value="${bundle.bundleName}">${bundle.bundleName} (tags:${bundle.tags.length}, bookmarks:${bookmarkCount})</label>`;

  });
  document.querySelector('#bundles').innerHTML = html;
  //console.log('showBundles done');
}
//get html code by url, return htmlCode:string
const getHtmlCode = async (url) => {
  //console.log('----getHtmlCode:',url);
  try {
    const response = await fetch(url, { timeout: 5000 });
    const htmlCode = await response.text();
    //if return "Not allowed" then show alerts, if return code not 200 then show alerts
    if (htmlCode.includes('Not allowed')) {
      showMessage('Not allowed to access this page, maybe you are not logged in?', "#alert");
      return;
    }else if(response.status != 200){
      console.log('No public bookmarks: ' + url);
      return;
    }
    return htmlCode;
  } catch (error) {
    console.error(`const getHtmlCode: Error fetching URL: ${url}`, error);
  }
}
/*get https://pinboard.in cookies
const getCookiesForPinboard = async () => {
  console.log('getCookiesForPinboard');
  const BASE_URL = 'https://pinboard.in';
  const cookies = await browser.cookies.getAll({url:BASE_URL});
  console.log("getCookiesForPinboard done");
  return cookies;
}*/
//Get username(Pinboard ID)
const getUsername = () => {
  //console.log('getUsername');
  username = document.querySelector('#pinboard_id').value;
  console.log("username: " + username);
  //console.log("getUsername done");
}
//get all bundles' url, return bundles:[{bundleName:"",url:"",pageCode:"",tags:[{tagName:"",url:""}]
const getAllBundles = async () => {
  getUsername();
  if (username == '') {
    showMessage('Please enter Pinboard ID (username)', "#alert");
    return;
  }
  allBundles = [];
  const bundlesPageUrl = `${BASE_URL}/u:${username}/bundles/`;
  let response;
  //console.log('getAllBundles:', bundlesPageUrl);
  try {
    response = await fetch(bundlesPageUrl, { timeout: 5000 });

  } catch (error) {
    showMessage('Error fetching URL: ' + bundlesPageUrl, "#alert");
  }
  const html = await response.text();
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const aElements = doc.querySelectorAll('a.bundle');
  if (aElements.length == 0) {
    showMessage(`Bundle is empty, Please <a href=${bundlesPageUrl}>create</a> first or check your username.`, "#alert");
    return;
  } else {
    document.getElementById("get_bundles").setAttribute("aria-busy", "true");
  }
  for (const aElement of aElements) {
    const pageCode = await getHtmlCode(BASE_URL + aElement.getAttribute('href'));
    const tags = getTagsPerBundle(pageCode);
    allBundles.push({
      bundleName: aElement.textContent.trim(),
      url: aElement.getAttribute('href'),
      pageCode: pageCode,
      tags: tags
    });
  }
  //showMessage(checkResults(allBundles),"#alert");
  showBundles(allBundles);
  //console.log("getAllBundles done");
  return allBundles;
}
const getSelectedBundles = () => {
  //console.log('selectedBundles');
  const bundleCheckboxes = document.querySelectorAll('input[name="bundle"]');
  selectedBundles = [];
  bundleCheckboxes.forEach(checkbox => {
    if (checkbox.checked) {
      //search bundles by name in allBundles and push it to selectedBundles
      allBundles.forEach(bundle => {
        if (bundle.bundleName == checkbox.value) {
          selectedBundles.push(bundle);
        }
      });
    }
  });
  //console.log('selectedBundles done');
}
//EN: get all tags in a bundle, return tags:[{name:"",url:""}]
const getTagsPerBundle = (bundleHtmlCode) => {
  //console.log('getTagsPerBundle:',bundleUrl);
  const parser = new DOMParser();
  const doc = parser.parseFromString(bundleHtmlCode, 'text/html');
  const aTags = doc.querySelectorAll('div#right_bar a');
  const tags = [];
  aTags.forEach(tag => {
    if (tag.classList.contains('tag')) {
      //console.log("name:",tag.textContent.trim(),"url:",tag.pathname,"tag:",tag);
      tags.push({
        tagName: tag.textContent.trim(),
        url: tag.pathname
      });
    }
  });
  //console.log("getTagsPerBundle ",bundleUrl," done");
  return tags;
}
//EN: get all bookmarks in a tag, return bookmarks:[{title:"",url:""}]
const getBookmarksPerTag = async (tagUrl) => {
  const htmlCode = await getHtmlCode(tagUrl);
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlCode, 'text/html');
  const aElements = doc.querySelectorAll('a.bookmark_title');
  const bookmarksPerTab = [];
  for (const aElement of aElements) {
    bookmarksPerTab.push({
      title: aElement.textContent.trim(),
      url: aElement.href
    });
  }

  const earlierLink = doc.querySelector('#top_earlier');
  if (earlierLink) {
    const href = earlierLink.getAttribute('href');
    const subBookmarks = await getBookmarksPerTag(`${BASE_URL}${href}`);
    bookmarksPerTab.push(...subBookmarks);
  }

  checkResults(bookmarksPerTab);
  //console.log(bookmarksPerTab.length);
  return bookmarksPerTab;
}
//get all Bookmarks in selected bundles, return allBookmarks:{bundleName:{tagName:{title:"",url:""}}}
const getAllBookmarks = async () => {
  //console.log('main:getAllBookmarks');
  allBookmarks = {};
  getSelectedBundles();
  document.getElementById('bookmark').setAttribute("aria-busy", "true");

  if (selectedBundles.length == 0) {
    showMessage('Please select at least one bundle', "#alert");
    return;
  }
  toggleModal("dialog_bookmarks", "true");
  for (const bundle of selectedBundles) {
    //console.log("fetch:",`${BASE_URL}${bundle.url}`);
    for (const tag of bundle.tags) {
      const bookmarks = await getBookmarksPerTag(`${BASE_URL}${tag.url}`); 
      if (!allBookmarks.hasOwnProperty(bundle.bundleName)) {
        allBookmarks[bundle.bundleName] = {};
      }
      if (!allBookmarks[bundle.bundleName].hasOwnProperty(tag.tagName)) {
        allBookmarks[bundle.bundleName][tag.tagName] = {};
      }
      allBookmarks[bundle.bundleName][tag.tagName] = bookmarks;
    }
  }
  showBookmark();
  //console.log('main:getAllBookmarks done', allBookmarks);
}
// save to firefox bookmarks toolbar, if the folder exists, create new
const saveToFirefox_create = async () => {
  //console.log('saveToFirefox');
  document.getElementById('add_to_bookmarkBar').setAttribute('aria-busy', 'true');
  const bookmarks = await browser.bookmarks.getTree();
  const toolbar = bookmarks[0].children.find(child => child.type === 'folder' && child.id === 'toolbar_____'); for (const bundleName in allBookmarks) {
    const bundle = allBookmarks[bundleName];
    const bundleFolder = await browser.bookmarks.create({
      parentId: toolbar.id,
      title: bundleName
    });
    for (const tagName in bundle) {
      const tag = bundle[tagName];
      const tagFolder = await browser.bookmarks.create({
        parentId: bundleFolder.id,
        title: tagName
      });
      for (const bookmark of tag) {
        await browser.bookmarks.create({
          parentId: tagFolder.id,
          title: bookmark.title,
          url: bookmark.url
        });
      }
    }
  }
  document.getElementById('add_to_bookmarkBar').setAttribute('aria-busy', 'false');
  toggleModal("dialog_bookmarks", "false");
  showMessage("🎉Done!🎉","#alert");
  //console.log('saveToFirefox done');
}
// save to firefox bookmarks toolbar, if the folder exists, overwrite it
const saveToFirefox_overwrite = async () => {
  //console.log('saveToFirefox_overwrite');
  const bookmarks = await browser.bookmarks.getTree();
  const toolbar = bookmarks[0].children.find(child => child.type === 'folder' && child.id === 'toolbar_____');
  document.getElementById('add_to_bookmarkBar').setAttribute('aria-busy', 'true');
  for (const bundleName in allBookmarks) {
    const bundle = allBookmarks[bundleName];
    let bundleFolder = toolbar.children.find(child => child.title === bundleName);

    if (!bundleFolder) {
      bundleFolder = await browser.bookmarks.create({
        parentId: toolbar.id,
        title: bundleName
      });
    }

    for (const tagName in bundle) {
      const tag = bundle[tagName];
      let tagFolder = bundleFolder.children ? bundleFolder.children.find(child => child.title === tagName) : null;

      if (!tagFolder) {
        tagFolder = await browser.bookmarks.create({
          parentId: bundleFolder.id,
          title: tagName
        });
      } else {
        // Remove existing bookmarks in the folder
        for (const child of tagFolder.children) {
          await browser.bookmarks.remove(child.id);
        }
      }

      for (const bookmark of tag) {
        await browser.bookmarks.create({
          parentId: tagFolder.id,
          title: bookmark.title,
          url: bookmark.url
        });
      }
    }
    toggleModal("dialog_bookmarks", "false");
    showMessage("🎉Done!🎉","#alert");
  }
  document.getElementById('add_to_bookmarkBar').setAttribute('aria-busy', 'false');
  //console.log('saveToFirefox_overwrite done');
}
const add_to_bookmarkBar = () =>{
  document.getElementById("overwrite_folder").checked ? saveToFirefox_overwrite() : saveToFirefox_create();
}
//show Modal dialog
const toggleModal = (id, status) => {
  //console.log("toggleModal");
  const modal = document.getElementById(id);
  if (status === 'true') {
    modal.setAttribute('open', status);
  } else {
    modal.removeAttribute('open');
  }
}
//export allBookmarks as json file
const exportJson = () => {
  //console.log("saveAsJson");
  document.getElementById('export').setAttribute('aria-busy', 'true');
  const data = JSON.stringify(allBookmarks);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'allbookmarks.json';
  a.click();
  document.getElementById('export').setAttribute('aria-busy', 'false');
  //console.log("saveAsJson done");
}
//import json file as allBookmarks
const importJson = () => {
  //console.log("importJson");
  document.getElementById('import').setAttribute('aria-busy', 'true');
  document.getElementById('bookmark').setAttribute('aria-busy', 'true');
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) {
      console.error("No file selected");
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      try {
        allBookmarks = JSON.parse(event.target.result);
        //console.log("allBookmarks: ", allBookmarks);
        showBookmark();
      } catch (error) {
        console.error("Error parsing JSON file", error);
      }
    };
    reader.readAsText(file);
    toggleModal("dialog_bookmarks", "true");
    document.getElementById('import').setAttribute('aria-busy', 'false');
  });
  input.click();
  //console.log("importJson done");
}
const resetData = () => {
  allBundles = [];
  selectedBundles = [];
  allBookmarks = {};
  document.getElementById('bookmark').innerHTML = '';
  showBundles();
}

document.getElementById('pinboard_id').addEventListener('input', () => {resetData();});
document.getElementById("get_bundles").addEventListener("click", (e) => { getAllBundles(); });
document.getElementById("get_bookmarks").addEventListener("click", (e) => { getAllBookmarks(); });
document.getElementById("add_to_bookmarkBar").addEventListener("click", (e) => { add_to_bookmarkBar(); });
document.getElementById("export").addEventListener("click", (e) => { exportJson(); });
document.getElementById("import").addEventListener("click", (e) => { importJson(); });
document.getElementById("dialog_button").addEventListener("click", (e) => { toggleModal('dialog', 'false'); });
document.getElementById("dialog_bookmarks_button").addEventListener("click", (e) => { toggleModal('dialog_bookmarks', 'false'); });
document.documentElement.setAttribute('data-theme', 'light');

//TODO: add description from Pinboard