// ================================
// USUÁRIOS AUTORIZADOS
// ================================

const usuarios = [
    {
        usuario: "Rafael",
        senha: "Moyacezarino"
    },
    {
        usuario: "Genesio",
        senha: "Moyacezarino"
    }
];


// ================================
// ELEMENTOS
// ================================

const loginScreen = document.getElementById("login-screen");
const appScreen = document.getElementById("app-screen");

const formLogin = document.getElementById("login-form");
const mensagemErro = document.getElementById("login-error");


// ================================
// VERIFICAR SE JÁ ESTÁ LOGADO
// ================================

const usuarioLogado = localStorage.getItem("usuarioLogado");

if (usuarioLogado) {
    mostrarSistema();
} else {
    mostrarLogin();
}


// ================================
// FORMULÁRIO DE LOGIN
// ================================

formLogin.addEventListener("submit", function (event) {

    event.preventDefault();

    const usuarioDigitado = document
        .getElementById("login-usuario")
        .value
        .trim();

    const senhaDigitada = document
        .getElementById("login-senha")
        .value;


    const usuarioEncontrado = usuarios.find(function (usuario) {

        return (
            usuario.usuario === usuarioDigitado &&
            usuario.senha === senhaDigitada
        );

    });


    if (usuarioEncontrado) {

        localStorage.setItem(
            "usuarioLogado",
            usuarioEncontrado.usuario
        );

        mostrarSistema();

    } else {

        mensagemErro.textContent =
            "Usuário ou senha incorretos.";

        mensagemErro.style.display = "block";

    }

});


// ================================
// MOSTRAR LOGIN
// ================================

function mostrarLogin() {

    loginScreen.style.display = "flex";
    appScreen.style.display = "none";

}


// ================================
// MOSTRAR SISTEMA
// ================================

function mostrarSistema() {

    loginScreen.style.display = "none";
    appScreen.style.display = "block";

}


// ================================
// LOGOUT
// ================================

const btnLogout = document.getElementById("btn-logout");

if (btnLogout) {

    btnLogout.addEventListener("click", function () {

        localStorage.removeItem("usuarioLogado");

        mostrarLogin();

        document.getElementById("login-usuario").value = "";
        document.getElementById("login-senha").value = "";

    });

}