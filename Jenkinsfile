node {

    def dockerImage
    def registryCredential = 'DockerHub'
    def githubCredential = 'GitHub'
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
      dir('helmChart')
      {
          git ( branch: "${env.helmchart_branch}",
                credentialsId: githubCredential,
                url: "${env.helmchart_repo}"
               )
          sh "git config --global user.email 'patil.yo@husky.neu.edu'"
          sh "git config --global user.name 'test'"
          sh 'git config --global push.default current'
          echo "${BUILD_NUMBER}"
          sh "pwd"
          sh "ls"
          updatedVersion= nextVersionFromGit('patch')
          echo "UpdatedVersion"+ updatedVersion
          sh "yq r ./back-end/Chart.yaml version"
          sh "yq w -i ./back-end/Chart.yaml 'version' ${updatedVersion}"
          sh "yq r back-end/Chart.yaml version"
          sh "yq w -i ./back-end/values.yaml 'image.repository' ${env.registry}:$commit_id"
          sh('git add --all')
          sh "git commit -m 'Version bump ${updatedVersion}'"
          sh ('git push origin')

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