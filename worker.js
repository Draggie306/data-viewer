/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

// Dgames server-side dynamic content to display on the website.


// 1. Cloudflare Worker default stuff
export default {
  async fetch(request, env, ctx) {
    return await handleRequest(request, env);
  },
};


const UPLOAD_FOLDER = "uploads";
const UPLOAD_FOLDER_C = "client";
const UPLOAD_FOLDER_C_V2 = "client_v2";
const UPLOAD_FOLDER_TOOLS = "draggietools";
const ALLOWED_EXTENSIONS = ["txt", "log", "clientutils"];


// Settings are the (auto updater's) client-side settings that are required by the site and program
const ClientSettings = {
  "update_refresh_duration_sec": 1800,
  "additional": null,
  "dynamic_code_enabled": false,
  // "dynamic_code": dyc_code,
  "liveVersion": 67,
  "trusted_url_path": "https://logs.draggie.games",
  "hostname": "logs.draggie.games",
  "backup_hostname": "draggiegameslogsproxy.ibaguette.com",
  "backup_trusted_url_path": "https://draggiegameslogsproxy.ibaguette.com",
  "ctrl": false,
  "internalServerRunnerDir": "/",
  "proxied": true,
  "accessedAt": new Date().toISOString(),
  "dgames_logs_api_version": 2,
  "headers-expected": "'X-Draggiegames-App', 'Draggie-Client-Version', 'Username'",
  "uploadLogs": true,
  "fr": "disabled",
  "compression": "lzma2",
  "compression-Enabled": false, // returns are brotli compressed anyway
  "saturnian-updatesEnabled": true,
  "dtools-updatesEnabled": true,
  "logs_clientPathV1": "/client",
  "logs_clientPathV1Method": "POST",
  "logs_clientPathV2": "/client/api/v2",
  "logs_clientPathV2Method": "POST",
}

async function handleRequest(request, env) {

  if (request.method != "POST") {
    return new Response(`The logs.draggie.games backend service typically uses POST requests.<br><br>Accessed at ${new Date().toISOString()}`);
  }

  const url = new URL(request.url);
  const path = url.pathname;
  if (path === "/client/settings") {
    return new Response(JSON.stringify(ClientSettings), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  if (path === "/client/api/v2") {
    return await handleClientV2(request, env);
  }

}


// Auto updater client handler
async function handleClientV2(request, env) {
  console.log(`/client/api/v2 accessed at ${new Date().toISOString()}`);
  var headers = request.headers;

  // Parse headers to ensure that only modern versions are being used.
  if (!headers.has("X-Draggiegames-App")) {
    return new Response("error: No client version specified", {status: 400});
  }

  if (headers.get("X-Draggiegames-App") !== "AutoUpdateClient") {
    return new Response("error: Invalid client version", {status: 400});
  }

  if (!headers.has("Cf-Ipcountry")) {
    console.log("unfatal error: No IP country specified");
    var ipc = "unknown";
  } else {
    var ipc = headers.get("Cf-Ipcountry");
  }

  if (!headers.has("Draggie-Client-Version")) {
    console.log("unfatal: No client version specified");
    var client_ver = "unknown";
  } else {
    var client_ver = headers.get("Draggie-Client-Version");
  }

  if (!headers.has("Username")) {
    console.log("unfatal: No username specified");
    var username = "unknown";
  } else {
    var username = headers.get("Username");
  }

  // console.log(`User is located in ${ipc} and has IP ${request.headers.get("Cf-Connecting-Ip")}. Client version is ${client_ver} and username is ${username}`);

  // check for files in request
  const formData = await request.formData();
  const files = formData.getAll("file");
  if (files.length === 0) {
    console.log("error: could not seem to find the files in the request");
    return new Response(JSON.stringify({error: "No file part"}), {status: 400});
  }

  console.log(`Received ${files.length} files, filename is ${files[0].name}`);

  if (files[0].name === "") {
    return new Response(JSON.stringify({error: "No file"}), {status: 400});
  }

  const file = files[0];

  const extension = file.name.split(".").pop();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return new Response(JSON.stringify({error: "Invalid file"}), {status: 400});
  }

  var filename = file.name;
  var folder_name = username; // temp folder name for more structure
  var folder_path = `${UPLOAD_FOLDER_C_V2}/${client_ver}/${folder_name}`;

  var bucket = env.logs_bucket; // R2 bucket with s3 compatible API

  var full_path = `${folder_path}/${filename}`;

  await bucket.put(full_path, file);

  return new Response(JSON.stringify({success: true}), { // Turn this into a beautiful new GUI and site later! For now just have json response
    headers: {
      "Content-Type": "application/json",
    },
  });
}