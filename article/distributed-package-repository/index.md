---
id: 5
title: "Distributed Package Repository"
short: "A package repository built on top of Bittorrent and a blockchain"
image: ""
date: "2014-02-19"
---

Most software today is not written from scratch, but is instead a composition of several large pieces known as packages. These packages are built by many different people and are distributed using a package repository.  All package repositories (that I know of) are centralized. In this article I will describe a distributed package repository (DPR) where the package content and the metadata can be hosted on multiple servers without a single centralized authority.

I will only discuss package repositories in this article, not package managers. A package manager can be built on top of a package repository, and therefore does not need to be understood to build a package repository. Also, package managers need to deal with dependency hell, something the repository doesn't have to, and something I don't want to.

##What is a package repository?
A package repository must be able to do the following:

* ####Provide the contents of a package
The contents of a package must be hosted in the package repository and be accessible to others. Content usually means code, but can also include documentation, tests, build output and configuration. Users of the repository can download content from the repository to the local system.
* ####Map a name to a list of versions
The package repository must be able to provide all the versions of a package, given the package name. By providing the whole version history of a package the repository is also able to provide the latest version of a a package and a package manager can get enough information to upgrade to a newer version automatically.
* ####Map a name and version to package content
Given the name and specific version of a package the repository must be able to return the contents of the package. Most software has dependencies to several packages where the specific version of the package is needed for the program to run correctly. Only by knowing the exact version needed can the correct content be supplied to the user.
* ####Restrict who can publish a new version of a package
Only the owner of a package should be able to publish a new version of it. A package repository wouldn't be much use if anyone could publish a package with any name, even a name used by other package authors. 

In DPR the first requirement is solved using BitTorent, the second and fourth requirement is solved by using a block chain and the third requirement is solved using a magnet link.

#Technical description
The following is a technical description of how DPR can be implemented to provide the four main responsibilities of a package repository.

##Hosting package content in the BitTorrent swarm
BitTorrent is a protocol for storing data on multiple servers so it can be downloaded from multiple places at once. In the BitTorrent network a peer can download a file from multiple other peers, and the moment a piece of the file has been successfully downloaded, the peer is able to share that piece with others who wish to download the file. This works great for large files (or collections of files) since a peer can connect to multiple seeders instead of connecting to one single source.

The main advantages of BitTorrent for DPR is that it provides fault tolerance, as there is no single point of failure, and potentially increased download speed, as there is no single server that must shoulder the entire load. It also means that anyone can publish and host their own packages. A team of developers can set up a BitTorrent server to host the packages they use the most often, instead of having to access a centralized location over a slow Internet connection.

BitTorrent uses a torrent file to guarantee for the contents of a file or collection of files. The file is split into many blocks all of the same size, and the hash of each block is found. The hash is generated using a cryptographic hashing algorithm that makes it practically impossible to recreate the content of a block from a hash. The torrent file contains the list of hashes, one for each block, so the downloader can verify that the block provided by other peers in the swarm has not been tampered with.

##Enforcing ownership using the block chain
Bitcoin is a distributed cryptocurrency where every node has the entire history of the currency. Nodes in the system do not need to trust each other and yet they can work together to transfer value from one party to another. Bitcoin refers not only to the cryptocurrency, but also to the protocol that the currency uses. I will use the word Bitcoin to refer to the protocol, not the currency.

The block chain is a key part of the Bitcoin protocol. The protocol uses a distributed block chain to keep a public ledger of all transactions ever executed in the currency. Each block in the chain has a hash of the previous chain, going all the way back to the genesis block. The hash ensures that a block must have been generated after the previous block, since it is practically impossible to create the contents of a block from a known hash, but trivial to generate a hash from the contents of a block. This also means that a block in the middle of the chain cannot be altered, as then it would no longer match the hash contained in the next block in the chain. 

In the Bitcoin currency's block chain, new blocks are added every 10 minutes by so called miners. Generating the hash is made intentionally difficult, which proves that the miner had to work hard to create the block. This proof of work ensures that tampering with the block chain is practically impossible. Verifying that the block chain is correct is relatively easy by all nodes in the network, which means that the network will quickly discard an invalid block. 

The result is that once a block has been mined it will stay in the chain forever, and since the chain is replicated on the system of all nodes in the network, the content of the block can be accessed by anyone at any time. In addition to the hash the block can contain other data, for example transactions of the Bitcoin currency. 

A transaction is a transfer of value between a sender and a receiver. All users of Bitcoin have a public key and private key pair. The public key can be shared with anyone and can be used to transfer money to. It is known as an address in Bitcoin, since money can be sent to it (actually it is the hash of the public key, but that is not technically important). Only the person with the respective private key can access the money sent to a public key, and transfer it to another public key. In other words, if a transaction in a block indicates that value was transfered from public key A to public key B, then only the person with private key A could have done that. Now that the value is transferred to public key B, only the person with private key B can transfer it to public key C.

While not condoned in the Bitcoin protocol, it is possible to attach arbitrary data to a transaction, for example a name. This can be interpreted as transferring the ownership of the name from A to B along with the currency. From now on B owns the name and only B can transfer the ownership of the name to another party. Any attempt by someone else to transfer the ownership of the name would be rejected by the network, which has access to the full ownership history of the name through the block chain.

This has only been a short introduction to the Bitcoin protocol. There are many other technicalities that makes the protocol secure and tamper proof, which I will not discuss here.

##Mapping a name to a version using the block chain
So far we have seen that a name can be stored in a transaction in a bock in the distributed chain, such that it is practically impossible to steal the name. This ensures that there is only one owner of the name at any given time. In addition to storing the name in the transaction, other arbitrary data can also be stored in the transaction. This turns the block chain into a key-value store, where data can never be deleted or overwritten, since tampering with the block chain is practically impossible. 

If the key is the name of a package, then the value can be the version of the package. To publish a new version a transaction is made with the name and the bumped version number, and the name is transferred to another public key owned by the same person. Since the block chain is public knowledge, the version history of a package can be extracted from the block chain.

##Mapping a version to the contents
Instead of storing only the version number as the value in the key-value store that is the distributed block chain used by DPR, the value can consist of the version number and a magnet link. A magnet link is a hash of a torrent file. A torrent file, as described earlier, consists of a list of hashes that certify the contents of the file has not been tampered with. In the same way the magnet link can certify that the torrent file has not been tampered with. The result is that a 20 byte string is all that is needed to download a file of several gigabytes from a distributed network. 

The BitTorrent network uses a Distributed Hash Table (DHT) to map a magnet link to a torrent file. Peers in the network automatically organize the hash table among themselves so not everyone has to replicate the entire table while every part of the table is replicated among multiple peers. A peer can ask the rest of the network to look up a torrent file using a magnet link, and the DHT will find the nearest node with that torrent file. Once the peer has the torrent file it can start downloading the files from the seeds.

#Proof of concept
I have created a proof of concept using BitTorrent and Namecoin. Namecoin is an alt coin that allows arbitary key value pairs to be stored on the block chain. While Namecoin was originally created for domain names, its design is general enough to store arbitrary key-value pairs on the block chain. 

Namecoin requires a namespace in addition to a name, and on the namecoin network dpr is the namespace for DPR packages. Using a Namecoin [block explorer](http://explorer.namecoin.info) you can look up the history of a DPR package, for example the [proof of concept DPR implementation](http://explorer.namecoin.info/n/dpr/dpr).

This proof of concept is able to download and install itself. It is built with NodeJS, use TorrentStream to download torrents and connects to a Namecoin client installed on the same machine to access the Namecoin network. 

#Advantages of DPR
With a distributed package repository there is no single point of failure.

