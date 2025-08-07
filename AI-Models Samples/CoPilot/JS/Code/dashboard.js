// dashboard.js
fetch("/api/dashboard", {
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
})
