node {

    def dockerImage
    def registryCredential = 'DockerHub'
    def commit_id
	
	stage('Clone repository') {
        /* Cloning the Repository to our Workspace */
        checkout scm
    }
	stage('Building image') {

        commit_id = sh(returnStdout: true, script: 'git rev-parse HEAD')
  		echo "$commit_id"
        dockerImage = docker.build ("${env.registry}")
        
	}
	stage('Registring image') {
        docker.withRegistry( '', registryCredential ) {
            dockerImage.push("$commit_id")
		}
    }
}