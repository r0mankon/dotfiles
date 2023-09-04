# Steps

`git clone https://github.com/r0mankon/dotfiles ~/.dotfiles`

`cd ~/.dotfiles`

`./setup.[linux/mac].sh`

# Notes

Most of the things are automated except for deb & appImage packages which are supposed to be downloaded manually from the respective site.

#### Delete or comment out the following line in `setup.sh` if not on KDE

`# ./kde.sh`

## Fonts

Sorted by preference

- ### Editor

  - Meslo or Menlo
  - Jetbrains Mono
  - Cascadia Code

- ### Terminal

  - Meslo Nerd Font patched for Powerlevel10k
  - Cascadia Mono PL

## Caution for others

- Delete `.config/user-dirs.dirs` if you don't know what you're doing!

## Make ntfs drive writeable on macOS

`brew tap gromgit/homebrew-fuse`
`brew install ntfs-3g-mac`

- ### Need to disable SIP in recovery mode

   `csrutil disable`

- ### Replace the built-in `mount_ntfs` with `ntfs-3g-mac`

   ```sh
   sudo mount -uw /
   sudo mv /sbin/mount_ntfs /sbin/mount_ntfs.original
   sudo ln -s /usr/local/sbin/mount_ntfs /sbin/mount_ntfs
   ```

- ### Re-enable SIP

   `csrutil enable`
