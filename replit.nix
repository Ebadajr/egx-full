{ pkgs }: {
  deps = [
    pkgs.nodejs_20
    pkgs.python311
    pkgs.python311Packages.pip
    pkgs.chromium
    pkgs.unzip
    # Playwright chromium-headless-shell system library deps
    pkgs.nss
    pkgs.nspr
    pkgs.atk
    pkgs.cups
    pkgs.libdrm
    pkgs.gtk3
    pkgs.pango
    pkgs.cairo
    pkgs.xorg.libX11
    pkgs.xorg.libXcomposite
    pkgs.xorg.libXdamage
    pkgs.xorg.libXext
    pkgs.xorg.libXfixes
    pkgs.xorg.libXrandr
    pkgs.xorg.libxcb
    pkgs.libxkbcommon
    pkgs.dbus
    pkgs.expat
    pkgs.alsa-lib
  ];
}
