node {

    def dockerImage
    def registryCredential = 'DockerHub'
    def githubCredential = 'GithubKey'
    def commit_id



	stage('Clone repository') {
        /* Cloning the Repository to our Workspace */
        sh 'rm webapp-backend -rf; mkdir webapp-backend'
        dir('webapp-backend') {
                checkout scm
            }

    }
	stage('Building image') {
        dir('webapp-backend'){
        commit_id = sh(returnStdout: true, script: 'git rev-parse HEAD')
  		echo "$commit_id"
        dockerImage = docker.build ("${env.registry}")
        }
	}
	stage('Registring image') {
	    dir('webapp-backend'){
        docker.withRegistry( '', registryCredential ) {
            dockerImage.push("$commit_id")
		}
	 }
    }

   stage('Clone another repository') {
     /* Cloning the Repository to our Workspace */

      sh 'rm helmChart -rf; mkdir helmChart'
      dir('helmChart') {
                       git ( branch: 'Testing-Jenkins',
                             credentialsId: githubCredential,
                             url: 'git@github.com:Jagman13/helm-charts.git'
                           )
   //                           sh "git config --global user.email 'user@test.com'"
   //                           sh "git config --global user.name 'test'"
   //                                                   sh 'git config --global push.default current'
                                                     echo "${BUILD_NUMBER}"
                                                     sh "pwd"
                                                     sh "ls"
                                                     updatedVersion= nextVersionFromGit('patch')
                                                     echo "UpdatedVersion"+ updatedVersion
                                                     sh "yq r ./back-end/Chart.yaml version"
                                                     sh "yq w -i ./back-end/Chart.yaml 'version' ${updatedVersion}"
                                                     sh "yq r back-end/Chart.yaml version"
                                                     sh "yq w -i ./back-end/values.yaml 'image.repository' ${env.registry}:12345"
                                                     sh('git add --all')
                                                     sh ('git commit -m "Merged develop branch to master"')
                                                     sshagent (credentials: ['GithubKey']) {
                                                       sh ('git push origin Testing-Jenkins')
                   }

                }
           }
}


def nextVersionFromGit(scope) {
        def latestVersion = sh returnStdout: true, script: 'yq r ./back-end/Chart.yaml version'
        def (major, minor, patch) = latestVersion.tokenize('.').collect { it.toInteger() }
        def nextVersion
        switch (scope) {
            case 'major':
                nextVersion = "${major + 1}.0.0"
                break
            case 'minor':
                nextVersion = "${major}.${minor + 1}.0"
                break
            case 'patch':
                nextVersion = "${major}.${minor}.${patch + 1}"
                break
        }
        nextVersion
    }